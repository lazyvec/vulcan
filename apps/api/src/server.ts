import { randomUUID } from "node:crypto";
import { setDefaultAutoSelectFamily } from "node:net";
import { Client } from "pg";

// IPv6 ENETUNREACH 방지 — Telegram API 등 외부 fetch에 필요
setDefaultAutoSelectFamily(false);
import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { cors } from "hono/cors";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { streamSSE } from "hono/streaming";
import {
  createAgentInputSchema,
  createApprovalPolicyInputSchema,
  createEventSchema,
  createTaskCommentInputSchema,
  createTaskDependencyInputSchema,
  createTaskInputSchema,
  delegateCommandInputSchema,
  directCommandInputSchema,
  ingestPayloadSchema,
  installSkillInputSchema,
  realtimeClientMessageSchema,
  circuitBreakerConfigInputSchema,
  createWorkOrderInputSchema,
  updateWorkOrderInputSchema,
  workResultInputSchema,
  workOrderCheckpointInputSchema,
  resolveApprovalInputSchema,
  taskLanePatchSchema,
  traceIngestPayloadSchema,
  updateAgentInputSchema,
  updateApprovalPolicyInputSchema,
  updateNotificationPreferencesSchema,
  updateTaskInputSchema,
  upsertSkillInputSchema,
} from "@vulcan/shared/schemas";
import type {
  AgentCommand,
  AgentCommandStatus,
  Approval,
  RealtimeServerMessage,
} from "@vulcan/shared/types";
import {
  addTaskComment,
  addTaskDependency,
  appendAuditLog,
  appendEvent,
  countRecords,
  createAgent,
  createAgentCommand,
  createTask,
  deactivateAgent,
  deleteTask,
  deleteTaskDependency,
  getAgentById,
  getAgentCommandById,
  getAgentCommands,
  getAgentSkills,
  getAgents,
  getActivityEvents,
  getAuditLogs,
  getAuditLogsFiltered,
  getDocs,
  getEventStats,
  getEventsSince,
  getGateways,
  getLatestEvents,
  getMemoryItems,
  createMemoryItem,
  updateMemoryItem,
  deleteMemoryItem,
  searchMemoryItems,
  getProjects,
  getSchedules,
  getSkillById,
  getSkillRegistry,
  getSkills,
  getTaskById,
  getTaskComments,
  getTaskDependencies,
  getTasks,
  installSkillToAgent,
  removeSkillFromAgent,
  syncAgentSkillsFromGateway,
  updateAgent,
  updateAgentCommand,
  updateTask,
  updateTaskLane,
  upsertGateway,
  upsertSkill,
  upsertSkillRegistry,
  getNotificationPreferences,
  upsertNotificationPreferences,
  appendNotificationLog,
  getNotificationLogs,
  getApprovalPolicies,
  getApprovalPolicyById,
  createApprovalPolicy,
  updateApprovalPolicy,
  findMatchingPolicy,
  createApproval,
  getApprovals,
  getApprovalById,
  getApprovalByCommandId,
  resolveApproval,
  getPendingExpiredApprovals,
  getPendingApprovalCount,
  updateApprovalTelegramMessageId,
  appendTrace,
  getTracesSince,
  getDailyCostSummaries,
  getCircuitBreakerConfig,
  getAllCircuitBreakerConfigs,
  upsertCircuitBreakerConfig,
  checkCircuitBreaker,
  getCBTriggerHistory,
  getTaskActivity,
  createWorkOrder,
  getWorkOrder,
  listWorkOrders,
  updateWorkOrder,
  createWorkResult,
  getWorkResultsByOrderId,
  saveWorkOrderCheckpoint,
  getWorkOrderStats,
} from "./store";
import { ensureSchema, getSqlite } from "./db";
import {
  getSubscriberCount,
  publishEvent,
  subscribeEvents,
} from "./event-stream";
import { getRuntimeInfo } from "./runtime-info";
import {
  closeQueueResources,
  enqueueCommandJob,
  enqueueHealthcheckJob,
  enqueueNotificationJob,
  getCommandQueue,
  getHealthcheckQueue,
  startQueueWorkers,
  type CommandQueueJobData,
  type NotificationQueueJobData,
} from "./queue";
import {
  answerCallbackQuery,
  editTelegramMessage,
  formatApprovalRequestMessage,
  formatApprovalResultMessage,
  formatEventMessage,
  getApprovalInlineKeyboard,
  getDefaultNotificationChatId,
  sendTelegramMessage,
  shouldNotify,
  startTelegramPolling,
  stopTelegramPolling,
} from "./telegram";
import type { TelegramCallbackQuery } from "./telegram";
import { getGatewayRpcClient } from "./gateway-rpc";
import {
  listVaultNotes,
  readVaultNote,
  readVaultFile,
  searchVaultNotesWithSnippet,
  clipUrlToVault,
  writeVaultNote,
  createVaultNote,
  deleteVaultNote,
  renameVaultNote,
  uploadToVault,
} from "./vault";
import { runVaultSync } from "./vault-sync";

const app = new Hono();
const WS_PATH = "/api/ws";
let wsClientCount = 0;
const gatewayRpcClient = getGatewayRpcClient();
const applyApiCors = cors({
  origin: process.env.VULCAN_CORS_ORIGIN ?? "*",
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
});
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

function sendWsMessage(
  ws: { send: (message: string) => void },
  message: RealtimeServerMessage,
) {
  try {
    ws.send(JSON.stringify(message));
  } catch {
    // Ignore best-effort send errors after disconnect.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function stringifyJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return "{}";
  }
}

function extractIssueItems(error: {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}) {
  return error.issues.map((issue) => ({
    path: issue.path.map((segment) => String(segment)).join("."),
    message: issue.message,
  }));
}

function writeAudit(input: {
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
}) {
  try {
    appendAuditLog({
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      beforeJson: stringifyJson(input.before),
      afterJson: stringifyJson(input.after),
      metadataJson: stringifyJson(input.metadata),
    });
  } catch (error) {
    console.error("[vulcan-api] audit write failed", error);
  }
}

function extractGatewayCommandId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const row = payload as Record<string, unknown>;
  if (typeof row.runId === "string" && row.runId.trim()) {
    return row.runId.trim();
  }
  if (typeof row.id === "string" && row.id.trim()) {
    return row.id.trim();
  }
  return null;
}

function getGatewayQueryParams(url: string): Record<string, unknown> {
  const query = new URL(url).searchParams;
  const params: Record<string, unknown> = {};
  for (const key of query.keys()) {
    const values = query.getAll(key).map((value) => value.trim()).filter(Boolean);
    if (values.length === 0) {
      continue;
    }
    params[key] = values.length === 1 ? values[0] : values;
  }
  return params;
}

async function parseGatewayParams(c: { req: { json: () => Promise<unknown> } }) {
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return { ok: false as const, error: "invalid JSON payload" };
  }

  if (!isRecord(payload)) {
    return { ok: false as const, error: "JSON object payload is required" };
  }

  return { ok: true as const, payload };
}

function buildDelegateRelayMessage(input: {
  targetAgentId: string;
  message: string;
  taskLabel?: string;
}) {
  return [
    "[VULCAN_DELEGATE]",
    `targetAgentId=${input.targetAgentId}`,
    input.taskLabel ? `taskLabel=${input.taskLabel}` : null,
    "",
    input.message,
  ]
    .filter(Boolean)
    .join("\n");
}

function isAgentCommandStatus(value: string): value is AgentCommandStatus {
  return value === "queued" || value === "sent" || value === "failed";
}

function parseAgentCommandPayload(command: AgentCommand): CommandQueueJobData | null {
  let payload: unknown;
  try {
    payload = JSON.parse(command.payloadJson);
  } catch {
    return null;
  }

  if (!isRecord(payload) || typeof payload.message !== "string" || !payload.message.trim()) {
    return null;
  }

  if (command.mode === "delegate") {
    return {
      commandId: command.id,
      mode: command.mode,
      agentId: command.agentId,
      message: payload.message.trim(),
      taskLabel: typeof payload.taskLabel === "string" ? payload.taskLabel : undefined,
      metadata: isRecord(payload.metadata) ? payload.metadata : undefined,
    };
  }

  return {
    commandId: command.id,
    mode: command.mode,
    agentId: command.agentId,
    message: payload.message.trim(),
    to: typeof payload.to === "string" ? payload.to : undefined,
    metadata: isRecord(payload.metadata) ? payload.metadata : undefined,
  };
}

function mergeAgentConfig(
  base: Record<string, unknown> | undefined,
  patch: Record<string, unknown>,
) {
  return {
    ...(base ?? {}),
    ...patch,
  };
}

function normalizeSessionKey(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function extractGatewaySessionKeyFromAgentConfig(config: Record<string, unknown> | undefined) {
  if (!isRecord(config)) {
    return null;
  }
  return normalizeSessionKey(config.gatewaySessionKey);
}

function extractGatewaySessionRows(payload: unknown): Array<Record<string, unknown>> {
  if (!isRecord(payload) || !Array.isArray(payload.sessions)) {
    return [];
  }
  return payload.sessions.filter((row): row is Record<string, unknown> => isRecord(row));
}

function pickGatewaySessionKeyForAgent(
  agentId: string,
  rows: Array<Record<string, unknown>>,
): string | null {
  const normalizedAgentId = agentId.trim().toLowerCase();
  if (!normalizedAgentId) {
    return null;
  }

  for (const row of rows) {
    const key = normalizeSessionKey(row.key);
    if (!key) {
      continue;
    }
    const keyLower = key.toLowerCase();
    if (
      keyLower === normalizedAgentId ||
      keyLower.includes(`:${normalizedAgentId}:`) ||
      keyLower.endsWith(`:${normalizedAgentId}`)
    ) {
      return key;
    }
  }

  for (const row of rows) {
    const key = normalizeSessionKey(row.key);
    if (!key) {
      continue;
    }
    const displayName = typeof row.displayName === "string" ? row.displayName.toLowerCase() : "";
    const label = typeof row.label === "string" ? row.label.toLowerCase() : "";
    if (displayName.includes(normalizedAgentId) || label.includes(normalizedAgentId)) {
      return key;
    }
  }

  return null;
}

async function resolveGatewaySessionKeyForAgent(
  agentId: string,
  config: Record<string, unknown> | undefined,
) {
  const normalizedAgentId = normalizeSessionKey(agentId);
  if (!normalizedAgentId) {
    return null;
  }
  if (normalizedAgentId.includes(":")) {
    return normalizedAgentId;
  }

  const configKey = extractGatewaySessionKeyFromAgentConfig(config);
  if (configKey) {
    return configKey;
  }

  try {
    const listed = await gatewayRpcClient.sessionsList({
      limit: 200,
      includeGlobal: true,
      includeUnknown: true,
    });
    const rows = extractGatewaySessionRows(listed);
    const matched = pickGatewaySessionKeyForAgent(normalizedAgentId, rows);
    if (matched) {
      return matched;
    }

    if (normalizedAgentId.toLowerCase() === "hermes") {
      const mainSession = rows
        .map((row) => normalizeSessionKey(row.key))
        .find((key) => Boolean(key && key.startsWith("agent:main:")));
      if (mainSession) {
        return mainSession;
      }
      if (rows.length === 1) {
        return normalizeSessionKey(rows[0].key);
      }
    }
  } catch {
    // Ignore lookup failures and fall back to null.
  }

  return null;
}

function buildGatewayIdempotencyKey(input: unknown, prefix = "vulcan") {
  const value = normalizeSessionKey(input);
  if (value) {
    return value;
  }
  return `${prefix}-${randomUUID()}`;
}

async function executeCommandQueueJob(payload: CommandQueueJobData) {
  const actionBase = payload.mode === "delegate" ? "agent.delegate" : "agent.command";
  const target = payload.mode === "delegate" ? "hermes" : payload.to ?? payload.agentId;
  const targetConfig =
    payload.mode === "delegate"
      ? getAgentById("hermes")?.config
      : getAgentById(payload.to ?? payload.agentId)?.config;
  const message =
    payload.mode === "delegate"
      ? buildDelegateRelayMessage({
          targetAgentId: payload.agentId,
          taskLabel: payload.taskLabel,
          message: payload.message,
        })
      : payload.message;

  try {
    const sessionKey = await resolveGatewaySessionKeyForAgent(target, targetConfig);
    if (!sessionKey) {
      throw new Error(`gateway session key not resolved for target: ${target}`);
    }
    const gatewayResult = await gatewayRpcClient.chatSend({
      sessionKey,
      message,
      idempotencyKey: payload.commandId,
    });
    const done = updateAgentCommand(payload.commandId, {
      status: "sent",
      gatewayCommandId: extractGatewayCommandId(gatewayResult),
      executedAt: Date.now(),
      error: null,
    });

    writeAudit({
      action: `${actionBase}.sent`,
      entityType: "agent_command",
      entityId: payload.commandId,
      after: done,
      metadata: {
        queue: "bullmq",
        target,
        sessionKey,
        mode: payload.mode,
        gatewayResult,
      },
    });
  } catch (error) {
    const failed = updateAgentCommand(payload.commandId, {
      status: "failed",
      error: getErrorMessage(error),
      executedAt: Date.now(),
    });

    writeAudit({
      action: `${actionBase}.failed`,
      entityType: "agent_command",
      entityId: payload.commandId,
      after: failed,
      metadata: {
        queue: "bullmq",
        target,
        mode: payload.mode,
        error: getErrorMessage(error),
      },
    });
  }
}

async function executeHealthcheckQueueJob() {
  const gateway = gatewayRpcClient.getStatus();
  upsertGateway({
    id: "openclaw-main",
    name: "OpenClaw Gateway",
    url: gateway.url,
    protocol: "ws-rpc-v3",
    status: gateway.connected ? "connected" : gateway.connecting ? "connecting" : "disconnected",
    lastSeenAt: gateway.lastConnectedAt,
  });
}

async function executeNotificationQueueJob(payload: NotificationQueueJobData) {
  const result = await sendTelegramMessage(payload.chatId, payload.message);
  appendNotificationLog({
    chatId: payload.chatId,
    eventType: payload.eventType,
    message: payload.message,
    status: result.ok ? "sent" : "failed",
    error: result.error,
  });
  if (!result.ok) {
    throw new Error(result.error ?? "Telegram send failed");
  }
}

let healthcheckQueueTimer: ReturnType<typeof setInterval> | null = null;
let queueWorkersReady = false;
try {
  queueWorkersReady = startQueueWorkers({
    command: executeCommandQueueJob,
    healthcheck: executeHealthcheckQueueJob,
    notification: executeNotificationQueueJob,
  });
} catch (error) {
  queueWorkersReady = false;
  console.error("[vulcan-api] queue worker bootstrap failed", error);
}

if (queueWorkersReady) {
  void enqueueHealthcheckJob();
  healthcheckQueueTimer = setInterval(() => {
    void enqueueHealthcheckJob();
  }, 30_000);
}

// Phase 8: 서버 시작 시 pending 승인 타임아웃 복구
restorePendingApprovalTimeouts();

// Telegram long polling 시작 (인라인 키보드 콜백 수신)
void startTelegramPolling(handleTelegramCallback);

// Phase 7: Telegram 알림 — 이벤트 구독 후크
subscribeEvents((event) => {
  const prefs = getNotificationPreferences();
  if (!shouldNotify(event, prefs)) return;

  const chatId = prefs?.chatId || getDefaultNotificationChatId();
  if (!chatId) return;

  const message = formatEventMessage(event);

  const enqueued = enqueueNotificationJob({ chatId, eventType: event.type, message });
  void Promise.resolve(enqueued).then((queued) => {
    if (!queued) {
      // Redis 없으면 직접 발송 (로컬 모드)
      void sendTelegramMessage(chatId, message).then((result) => {
        appendNotificationLog({
          chatId,
          eventType: event.type,
          message,
          status: result.ok ? "sent" : "failed",
          error: result.error,
        });
      });
    }
  });
});

// Phase 11: 일별 비용 요약 Telegram 알림 (매일 23:00 KST)
let costReportTimer: ReturnType<typeof setInterval> | null = null;

function scheduleDailyCostReport() {
  // 1분마다 체크하여 KST 23:00에 발송
  costReportTimer = setInterval(() => {
    const now = new Date();
    const kstHour = (now.getUTCHours() + 9) % 24;
    const kstMin = now.getUTCMinutes();
    // 23:00 KST (= 14:00 UTC)에 한 번만 발송
    if (kstHour !== 23 || kstMin !== 0) return;

    const chatId = getDefaultNotificationChatId();
    if (!chatId) return;

    const since = Date.now() - 86400000;
    const summaries = getDailyCostSummaries(since);
    if (summaries.length === 0) return;

    let totalCost = 0;
    let totalTokens = 0;
    const lines: string[] = ["<b>📊 일별 비용 요약 (오늘)</b>\n"];
    for (const s of summaries) {
      const tokens = s.totalInputTokens + s.totalOutputTokens;
      totalCost += s.totalCost;
      totalTokens += tokens;
      lines.push(
        `• <b>${s.agentId}</b>: ${tokens.toLocaleString()} tok, $${s.totalCost.toFixed(4)} (${s.callCount}건)`,
      );
    }
    lines.push(`\n<b>합계</b>: ${totalTokens.toLocaleString()} tok, $${totalCost.toFixed(4)}`);

    void sendTelegramMessage(chatId, lines.join("\n"));
  }, 60_000);
}

app.use("*", logger());
app.use("/api/*", async (c, next) => {
  if (c.req.path === WS_PATH) {
    await next();
    return;
  }
  return applyApiCors(c, next);
});
app.use("*", async (c, next) => {
  await next();
  if (c.req.path === WS_PATH) {
    return;
  }
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  c.header("Cross-Origin-Opener-Policy", "same-origin");
});

app.onError((error, c) => {
  console.error("[vulcan-api] unhandled error", error);
  return c.json({ error: "internal server error" }, 500);
});

app.get("/api/agents", (c) => {
  const includeInactiveRaw = c.req.query("includeInactive") ?? "";
  const includeInactive =
    includeInactiveRaw === "1" || includeInactiveRaw.toLowerCase() === "true";
  return c.json({ agents: getAgents({ includeInactive }) });
});

app.post("/api/agents", async (c) => {
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON payload" }, 400);
  }

  const parsed = createAgentInputSchema.safeParse(payload);
  if (!parsed.success) {
    return c.json(
      {
        error: "invalid agent payload",
        issues: extractIssueItems(parsed.error),
      },
      400,
    );
  }

  const agent = createAgent({
    id: parsed.data.id,
    name: parsed.data.name,
    mission: parsed.data.mission,
    roleTags: parsed.data.roleTags,
    avatarKey: parsed.data.avatarKey,
    status: parsed.data.status,
    skills: parsed.data.skills,
    capabilities: parsed.data.capabilities,
    config: parsed.data.config,
    gatewayId: parsed.data.gatewayId ?? null,
    isActive: parsed.data.isActive,
  });

  let gatewayResult: { ok: boolean; result?: unknown; error?: string } | null = null;
  if (parsed.data.gatewayWorkspace) {
    try {
      const result = await gatewayRpcClient.agentsCreate({
        name: parsed.data.name,
        workspace: parsed.data.gatewayWorkspace,
        avatar: parsed.data.avatarKey,
      });
      gatewayResult = { ok: true, result };
    } catch (error) {
      gatewayResult = { ok: false, error: getErrorMessage(error) };
    }
  }

  writeAudit({
    action: "agent.create",
    entityType: "agent",
    entityId: agent.id,
    after: agent,
    metadata: {
      gatewayWorkspace: parsed.data.gatewayWorkspace ?? null,
      gatewayResult,
    },
  });

  return c.json({ agent, gateway: gatewayResult }, 201);
});

app.put("/api/agents/:id", async (c) => {
  const agentId = c.req.param("id");
  const before = getAgentById(agentId);
  if (!before) {
    return c.json({ error: "agent not found" }, 404);
  }

  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON payload" }, 400);
  }

  const parsed = updateAgentInputSchema.safeParse(payload);
  if (!parsed.success) {
    return c.json(
      {
        error: "invalid agent update payload",
        issues: extractIssueItems(parsed.error),
      },
      400,
    );
  }

  const updated = updateAgent(agentId, {
    name: parsed.data.name,
    mission: parsed.data.mission,
    roleTags: parsed.data.roleTags,
    avatarKey: parsed.data.avatarKey,
    status: parsed.data.status,
    skills: parsed.data.skills,
    capabilities: parsed.data.capabilities,
    config: parsed.data.config,
    gatewayId: parsed.data.gatewayId ?? undefined,
    isActive: parsed.data.isActive,
  });

  if (!updated) {
    return c.json({ error: "agent update failed" }, 500);
  }

  let gatewayResult: { ok: boolean; result?: unknown; error?: string } | null = null;
  const shouldSyncGateway =
    typeof parsed.data.name === "string" ||
    typeof parsed.data.avatarKey === "string" ||
    typeof parsed.data.model === "string" ||
    typeof parsed.data.gatewayWorkspace === "string";

  if (shouldSyncGateway) {
    try {
      const result = await gatewayRpcClient.agentsUpdate({
        agentId,
        name: parsed.data.name,
        avatar: parsed.data.avatarKey,
        model: parsed.data.model,
        workspace: parsed.data.gatewayWorkspace,
      });
      gatewayResult = { ok: true, result };
    } catch (error) {
      gatewayResult = { ok: false, error: getErrorMessage(error) };
    }
  }

  // status가 변경된 경우 실시간 이벤트 발행
  if (parsed.data.status && parsed.data.status !== before.status) {
    const statusEvent = appendEvent({
      source: "vulcan-api",
      type: "agent.status_changed",
      agentId,
      summary: `${agentId} → ${parsed.data.status}`,
      payloadJson: JSON.stringify({
        previousStatus: before.status,
        newStatus: parsed.data.status,
      }),
    });
    publishEvent(statusEvent);
  }

  writeAudit({
    action: "agent.update",
    entityType: "agent",
    entityId: agentId,
    before,
    after: updated,
    metadata: {
      gatewayResult,
    },
  });

  return c.json({ agent: updated, gateway: gatewayResult });
});

app.delete("/api/agents/:id", async (c) => {
  const agentId = c.req.param("id");
  const before = getAgentById(agentId);
  if (!before) {
    return c.json({ error: "agent not found" }, 404);
  }

  const agent = deactivateAgent(agentId);
  if (!agent) {
    return c.json({ error: "agent deactivate failed" }, 500);
  }

  writeAudit({
    action: "agent.deactivate",
    entityType: "agent",
    entityId: agentId,
    before,
    after: agent,
    metadata: { mode: "soft-delete" },
  });

  return c.json({ agent });
});

app.post("/api/agents/:id/pause", async (c) => {
  const agentId = c.req.param("id");
  const before = getAgentById(agentId);
  if (!before) {
    return c.json({ error: "agent not found" }, 404);
  }

  let reason: string | undefined;
  try {
    const payload = await c.req.json().catch(() => undefined);
    if (isRecord(payload) && typeof payload.reason === "string" && payload.reason.trim()) {
      reason = payload.reason.trim();
    }
  } catch {
    // Ignore optional payload parsing errors.
  }

  const sessionKey = await resolveGatewaySessionKeyForAgent(agentId, before.config);
  let gatewayResult: { ok: boolean; result?: unknown; error?: string } | null;
  if (sessionKey) {
    try {
      const result = await gatewayRpcClient.sessionsPatch({
        key: sessionKey,
        sendPolicy: "deny",
      });
      gatewayResult = { ok: true, result };
    } catch (error) {
      gatewayResult = { ok: false, error: getErrorMessage(error) };
    }
  } else {
    gatewayResult = { ok: false, error: "gateway session key not resolved for this agent" };
  }

  const configPatch: Record<string, unknown> = {
    paused: true,
    pausedAt: Date.now(),
    pauseReason: reason ?? null,
  };
  if (sessionKey) {
    configPatch.gatewaySessionKey = sessionKey;
  }

  const agent = updateAgent(agentId, {
    status: "idle",
    config: mergeAgentConfig(before.config, configPatch),
  });

  if (!agent) {
    return c.json({ error: "agent pause failed" }, 500);
  }

  writeAudit({
    action: "agent.pause",
    entityType: "agent",
    entityId: agentId,
    before,
    after: agent,
    metadata: {
      reason: reason ?? null,
      sessionKey,
      gatewayResult,
    },
  });

  return c.json({ agent, gateway: gatewayResult });
});

app.post("/api/agents/:id/resume", async (c) => {
  const agentId = c.req.param("id");
  const before = getAgentById(agentId);
  if (!before) {
    return c.json({ error: "agent not found" }, 404);
  }

  const sessionKey = await resolveGatewaySessionKeyForAgent(agentId, before.config);
  let gatewayResult: { ok: boolean; result?: unknown; error?: string } | null;
  if (sessionKey) {
    try {
      const result = await gatewayRpcClient.sessionsPatch({
        key: sessionKey,
        sendPolicy: "allow",
      });
      gatewayResult = { ok: true, result };
    } catch (error) {
      gatewayResult = { ok: false, error: getErrorMessage(error) };
    }
  } else {
    gatewayResult = { ok: false, error: "gateway session key not resolved for this agent" };
  }

  const configPatch: Record<string, unknown> = {
    paused: false,
    resumedAt: Date.now(),
    pauseReason: null,
  };
  if (sessionKey) {
    configPatch.gatewaySessionKey = sessionKey;
  }

  const agent = updateAgent(agentId, {
    status: "idle",
    config: mergeAgentConfig(before.config, configPatch),
  });

  if (!agent) {
    return c.json({ error: "agent resume failed" }, 500);
  }

  writeAudit({
    action: "agent.resume",
    entityType: "agent",
    entityId: agentId,
    before,
    after: agent,
    metadata: {
      sessionKey,
      gatewayResult,
    },
  });

  return c.json({ agent, gateway: gatewayResult });
});

app.post("/api/agents/:id/delegate", async (c) => {
  const targetAgentId = c.req.param("id");
  const targetAgent = getAgentById(targetAgentId);
  if (!targetAgent) {
    return c.json({ error: "target agent not found" }, 404);
  }
  if (targetAgent.isActive === false) {
    return c.json({ error: "target agent is inactive" }, 409);
  }

  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON payload" }, 400);
  }

  const parsed = delegateCommandInputSchema.safeParse(payload);
  if (!parsed.success) {
    return c.json(
      {
        error: "invalid delegate payload",
        issues: extractIssueItems(parsed.error),
      },
      400,
    );
  }

  const command = createAgentCommand({
    id: parsed.data.idempotencyKey,
    agentId: targetAgentId,
    mode: "delegate",
    command: "chat.send",
    payloadJson: stringifyJson(parsed.data),
  });

  // ── 승인 게이트 (Phase 8) ──
  const matchedPolicy = findMatchingPolicy({
    agentId: targetAgentId,
    mode: "delegate",
    command: parsed.data.message,
  });

  if (matchedPolicy) {
    const expiresAt = matchedPolicy.autoApproveMinutes
      ? Date.now() + matchedPolicy.autoApproveMinutes * 60_000
      : null;

    updateAgentCommand(command.id, { status: "pending_approval" });

    const approval = createApproval({
      agentCommandId: command.id,
      policyId: matchedPolicy.id,
      expiresAt,
    });

    writeAudit({
      action: "agent.delegate.pending_approval",
      entityType: "agent_command",
      entityId: command.id,
      after: { ...command, status: "pending_approval" },
      metadata: {
        policyId: matchedPolicy.id,
        policyName: matchedPolicy.name,
        approvalId: approval.id,
        targetAgentId,
      },
    });

    sendApprovalNotification(approval, matchedPolicy, targetAgentId, "delegate", parsed.data.message);

    if (expiresAt) {
      scheduleApprovalTimeout(approval.id, expiresAt - Date.now());
    }

    return c.json(
      { command: { ...command, status: "pending_approval" as const }, approval, queued: false },
      202,
    );
  }
  // ── 승인 게이트 끝 ──

  try {
    const queued = await enqueueCommandJob({
      commandId: command.id,
      mode: "delegate",
      agentId: targetAgentId,
      message: parsed.data.message,
      taskLabel: parsed.data.taskLabel,
      metadata: parsed.data.metadata,
    });
    if (queued) {
      writeAudit({
        action: "agent.delegate.queued",
        entityType: "agent_command",
        entityId: command.id,
        after: command,
        metadata: {
          queue: "bullmq",
          targetAgentId,
          via: "hermes",
        },
      });
      return c.json({ command, queued: true }, 202);
    }
  } catch (error) {
    const failed = updateAgentCommand(command.id, {
      status: "failed",
      error: getErrorMessage(error),
      executedAt: Date.now(),
    });

    writeAudit({
      action: "agent.delegate.enqueue_failed",
      entityType: "agent_command",
      entityId: command.id,
      after: failed ?? command,
      metadata: {
        queue: "bullmq",
        targetAgentId,
        error: getErrorMessage(error),
      },
    });

    return c.json({ error: getErrorMessage(error), command: failed ?? command }, 502);
  }

  const relayMessage = buildDelegateRelayMessage({
    targetAgentId,
    taskLabel: parsed.data.taskLabel,
    message: parsed.data.message,
  });

  try {
    const hermesSessionKey = await resolveGatewaySessionKeyForAgent(
      "hermes",
      getAgentById("hermes")?.config,
    );
    if (!hermesSessionKey) {
      throw new Error("gateway session key not resolved for hermes");
    }
    const gatewayResult = await gatewayRpcClient.chatSend({
      sessionKey: hermesSessionKey,
      message: relayMessage,
      idempotencyKey: command.id,
    });
    const done = updateAgentCommand(command.id, {
      status: "sent",
      gatewayCommandId: extractGatewayCommandId(gatewayResult),
      executedAt: Date.now(),
      error: null,
    });

    writeAudit({
      action: "agent.delegate",
      entityType: "agent_command",
      entityId: command.id,
      after: done ?? command,
      metadata: {
        queue: "inline",
        targetAgentId,
        via: "hermes",
        sessionKey: hermesSessionKey,
        gatewayResult,
      },
    });

    return c.json({ command: done ?? command, gateway: gatewayResult });
  } catch (error) {
    const failed = updateAgentCommand(command.id, {
      status: "failed",
      error: getErrorMessage(error),
      executedAt: Date.now(),
    });

    writeAudit({
      action: "agent.delegate.failed",
      entityType: "agent_command",
      entityId: command.id,
      after: failed ?? command,
      metadata: {
        queue: "inline",
        targetAgentId,
        via: "hermes",
        error: getErrorMessage(error),
      },
    });

    return c.json({ error: getErrorMessage(error), command: failed ?? command }, 502);
  }
});

app.post("/api/agents/:id/command", async (c) => {
  const agentId = c.req.param("id");
  const agent = getAgentById(agentId);
  if (!agent) {
    return c.json({ error: "agent not found" }, 404);
  }
  if (agent.isActive === false) {
    return c.json({ error: "agent is inactive" }, 409);
  }

  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON payload" }, 400);
  }

  const parsed = directCommandInputSchema.safeParse(payload);
  if (!parsed.success) {
    return c.json(
      {
        error: "invalid command payload",
        issues: extractIssueItems(parsed.error),
      },
      400,
    );
  }

  const command = createAgentCommand({
    id: parsed.data.idempotencyKey,
    agentId,
    mode: "direct",
    command: "chat.send",
    payloadJson: stringifyJson(parsed.data),
  });

  // ── 승인 게이트 (Phase 8) ──
  const matchedDirectPolicy = findMatchingPolicy({
    agentId,
    mode: "direct",
    command: parsed.data.message,
  });

  if (matchedDirectPolicy) {
    const expiresAt = matchedDirectPolicy.autoApproveMinutes
      ? Date.now() + matchedDirectPolicy.autoApproveMinutes * 60_000
      : null;

    updateAgentCommand(command.id, { status: "pending_approval" });

    const approval = createApproval({
      agentCommandId: command.id,
      policyId: matchedDirectPolicy.id,
      expiresAt,
    });

    writeAudit({
      action: "agent.command.pending_approval",
      entityType: "agent_command",
      entityId: command.id,
      after: { ...command, status: "pending_approval" },
      metadata: {
        policyId: matchedDirectPolicy.id,
        policyName: matchedDirectPolicy.name,
        approvalId: approval.id,
        target: parsed.data.to ?? agentId,
      },
    });

    sendApprovalNotification(approval, matchedDirectPolicy, agentId, "direct", parsed.data.message);

    if (expiresAt) {
      scheduleApprovalTimeout(approval.id, expiresAt - Date.now());
    }

    return c.json(
      { command: { ...command, status: "pending_approval" as const }, approval, queued: false },
      202,
    );
  }
  // ── 승인 게이트 끝 ──

  try {
    const queued = await enqueueCommandJob({
      commandId: command.id,
      mode: "direct",
      agentId,
      to: parsed.data.to,
      message: parsed.data.message,
      metadata: parsed.data.metadata,
    });
    if (queued) {
      writeAudit({
        action: "agent.command.queued",
        entityType: "agent_command",
        entityId: command.id,
        after: command,
        metadata: {
          queue: "bullmq",
          target: parsed.data.to ?? agentId,
        },
      });
      return c.json({ command, queued: true }, 202);
    }
  } catch (error) {
    const failed = updateAgentCommand(command.id, {
      status: "failed",
      error: getErrorMessage(error),
      executedAt: Date.now(),
    });

    writeAudit({
      action: "agent.command.enqueue_failed",
      entityType: "agent_command",
      entityId: command.id,
      after: failed ?? command,
      metadata: {
        queue: "bullmq",
        target: parsed.data.to ?? agentId,
        error: getErrorMessage(error),
      },
    });

    return c.json({ error: getErrorMessage(error), command: failed ?? command }, 502);
  }

  try {
    const target = parsed.data.to ?? agentId;
    const sessionKey = await resolveGatewaySessionKeyForAgent(
      target,
      parsed.data.to ? getAgentById(parsed.data.to)?.config : agent.config,
    );
    if (!sessionKey) {
      throw new Error(`gateway session key not resolved for target: ${target}`);
    }
    const gatewayResult = await gatewayRpcClient.chatSend({
      sessionKey,
      message: parsed.data.message,
      idempotencyKey: command.id,
    });
    const done = updateAgentCommand(command.id, {
      status: "sent",
      gatewayCommandId: extractGatewayCommandId(gatewayResult),
      executedAt: Date.now(),
      error: null,
    });

    writeAudit({
      action: "agent.command",
      entityType: "agent_command",
      entityId: command.id,
      after: done ?? command,
      metadata: {
        queue: "inline",
        target,
        sessionKey,
        gatewayResult,
      },
    });

    return c.json({ command: done ?? command, gateway: gatewayResult });
  } catch (error) {
    const failed = updateAgentCommand(command.id, {
      status: "failed",
      error: getErrorMessage(error),
      executedAt: Date.now(),
    });

    writeAudit({
      action: "agent.command.failed",
      entityType: "agent_command",
      entityId: command.id,
      after: failed ?? command,
      metadata: {
        queue: "inline",
        target: parsed.data.to ?? agentId,
        error: getErrorMessage(error),
      },
    });

    return c.json({ error: getErrorMessage(error), command: failed ?? command }, 502);
  }
});

app.get("/api/agent-commands", (c) => {
  const agentId = c.req.query("agentId");
  const statusRaw = c.req.query("status");
  const limitRaw = Number(c.req.query("limit") ?? "80");
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 300) : 80;

  let statusFilter: "all" | AgentCommandStatus = "all";
  if (statusRaw && statusRaw !== "all") {
    if (!isAgentCommandStatus(statusRaw)) {
      return c.json({ error: "invalid status filter" }, 400);
    }
    statusFilter = statusRaw;
  }

  const commands = getAgentCommands({
    agentId: agentId?.trim() ? agentId.trim() : undefined,
    status: statusFilter,
    limit,
  });
  return c.json({ commands });
});

app.get("/api/agent-commands/:id", (c) => {
  const command = getAgentCommandById(c.req.param("id"));
  if (!command) {
    return c.json({ error: "agent command not found" }, 404);
  }
  return c.json({ command });
});

app.post("/api/agent-commands/:id/retry", async (c) => {
  const sourceId = c.req.param("id");
  const sourceCommand = getAgentCommandById(sourceId);
  if (!sourceCommand) {
    return c.json({ error: "agent command not found" }, 404);
  }

  if (sourceCommand.status !== "failed") {
    return c.json({ error: "only failed commands can be retried" }, 409);
  }

  const targetAgent = getAgentById(sourceCommand.agentId);
  if (!targetAgent) {
    return c.json({ error: "target agent not found" }, 404);
  }
  if (targetAgent.isActive === false) {
    return c.json({ error: "target agent is inactive" }, 409);
  }

  const payload = parseAgentCommandPayload(sourceCommand);
  if (!payload) {
    return c.json({ error: "invalid command payload for retry" }, 400);
  }

  const retryActionBase =
    sourceCommand.mode === "delegate" ? "agent.delegate.retry" : "agent.command.retry";

  const retryCommand = createAgentCommand({
    agentId: sourceCommand.agentId,
    mode: sourceCommand.mode,
    command: sourceCommand.command,
    payloadJson: sourceCommand.payloadJson,
    requestedBy: "human-retry",
  });
  const retryPayload: CommandQueueJobData = {
    ...payload,
    commandId: retryCommand.id,
  };

  try {
    const queued = await enqueueCommandJob(retryPayload);
    if (queued) {
      writeAudit({
        action: `${retryActionBase}.queued`,
        entityType: "agent_command",
        entityId: retryCommand.id,
        before: sourceCommand,
        after: retryCommand,
        metadata: {
          queue: "bullmq",
          retryOf: sourceId,
        },
      });

      return c.json({ command: retryCommand, queued: true }, 202);
    }
  } catch (error) {
    const failed = updateAgentCommand(retryCommand.id, {
      status: "failed",
      error: getErrorMessage(error),
      executedAt: Date.now(),
    });

    writeAudit({
      action: `${retryActionBase}.enqueue_failed`,
      entityType: "agent_command",
      entityId: retryCommand.id,
      before: sourceCommand,
      after: failed ?? retryCommand,
      metadata: {
        queue: "bullmq",
        retryOf: sourceId,
        error: getErrorMessage(error),
      },
    });

    return c.json({ error: getErrorMessage(error), command: failed ?? retryCommand }, 502);
  }

  await executeCommandQueueJob(retryPayload);
  const finished = getAgentCommandById(retryCommand.id) ?? retryCommand;

  writeAudit({
    action: `${retryActionBase}.inline`,
    entityType: "agent_command",
    entityId: retryCommand.id,
    before: sourceCommand,
    after: finished,
    metadata: {
      queue: "inline",
      retryOf: sourceId,
    },
  });

  return c.json({ command: finished, queued: false });
});

app.get("/api/projects", (c) => c.json({ projects: getProjects() }));

app.get("/api/tasks", (c) => {
  const lane = c.req.query("lane") ?? "all";
  const q = c.req.query("q") ?? "";
  const projectId = c.req.query("projectId") ?? undefined;
  const assigneeAgentId = c.req.query("assigneeAgentId") ?? undefined;
  const priority = c.req.query("priority") ?? undefined;

  const tasks = getTasks({
    lane: lane as "all" | "backlog" | "queued" | "in_progress" | "review" | "done" | "archived",
    q,
    projectId,
    assigneeAgentId,
    priority: priority as "low" | "medium" | "high" | "critical" | undefined,
  });

  return c.json({ tasks });
});

app.get("/api/tasks/:id", (c) => {
  const task = getTaskById(c.req.param("id"));
  if (!task) return c.json({ error: "task not found" }, 404);
  return c.json({ task });
});

app.post("/api/tasks", async (c) => {
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON payload" }, 400);
  }

  const parsed = createTaskInputSchema.safeParse(payload);
  if (!parsed.success) {
    return c.json({ error: "invalid task payload", issues: extractIssueItems(parsed.error) }, 400);
  }

  const task = createTask(parsed.data);

  const event = appendEvent({
    source: "vulcan",
    type: "task_create",
    summary: `task created: ${task.title}`,
    taskId: task.id,
    projectId: task.projectId,
    agentId: task.assigneeAgentId,
  });
  publishEvent(event);

  writeAudit({
    action: "task.create",
    entityType: "task",
    entityId: task.id,
    before: null,
    after: task,
  });

  return c.json({ task }, 201);
});

app.patch("/api/tasks/:id", async (c) => {
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON payload" }, 400);
  }

  const parsed = taskLanePatchSchema.safeParse(payload);
  if (!parsed.success) {
    return c.json(
      {
        error: "invalid task lane payload",
        issues: extractIssueItems(parsed.error),
      },
      400,
    );
  }

  const beforeTask = getTasks({ lane: "all" }).find((task) => task.id === c.req.param("id")) ?? null;
  const task = updateTaskLane(c.req.param("id"), parsed.data.lane);
  if (!task) {
    return c.json({ error: "task not found" }, 404);
  }

  const event = appendEvent({
    source: "vulcan",
    type: "task_move",
    summary: `${task.id} moved to ${task.lane}`,
    taskId: task.id,
    projectId: task.projectId,
    agentId: task.assigneeAgentId,
    payloadJson: JSON.stringify({ lane: task.lane }),
  });

  publishEvent(event);

  writeAudit({
    action: "task.move",
    entityType: "task",
    entityId: task.id,
    before: beforeTask,
    after: task,
    metadata: { lane: parsed.data.lane },
  });

  return c.json({ task });
});

app.put("/api/tasks/:id", async (c) => {
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON payload" }, 400);
  }

  const parsed = updateTaskInputSchema.safeParse(payload);
  if (!parsed.success) {
    return c.json({ error: "invalid task payload", issues: extractIssueItems(parsed.error) }, 400);
  }

  const beforeTask = getTaskById(c.req.param("id"));
  const task = updateTask(c.req.param("id"), parsed.data);
  if (!task) {
    return c.json({ error: "task not found" }, 404);
  }

  const event = appendEvent({
    source: "vulcan",
    type: "task_update",
    summary: `task updated: ${task.title}`,
    taskId: task.id,
    projectId: task.projectId,
    agentId: task.assigneeAgentId,
  });
  publishEvent(event);

  writeAudit({
    action: "task.update",
    entityType: "task",
    entityId: task.id,
    before: beforeTask,
    after: task,
  });

  return c.json({ task });
});

app.delete("/api/tasks/:id", (c) => {
  const beforeTask = getTaskById(c.req.param("id"));
  const deleted = deleteTask(c.req.param("id"));
  if (!deleted) {
    return c.json({ error: "task not found" }, 404);
  }

  const event = appendEvent({
    source: "vulcan",
    type: "task_delete",
    summary: `task deleted: ${c.req.param("id")}`,
    taskId: c.req.param("id"),
  });
  publishEvent(event);

  writeAudit({
    action: "task.delete",
    entityType: "task",
    entityId: c.req.param("id"),
    before: beforeTask,
    after: null,
  });

  return c.json({ ok: true });
});

app.get("/api/tasks/:id/comments", (c) => {
  const task = getTaskById(c.req.param("id"));
  if (!task) return c.json({ error: "task not found" }, 404);
  const comments = getTaskComments(c.req.param("id"));
  return c.json({ comments });
});

app.post("/api/tasks/:id/comments", async (c) => {
  const task = getTaskById(c.req.param("id"));
  if (!task) return c.json({ error: "task not found" }, 404);

  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON payload" }, 400);
  }

  const parsed = createTaskCommentInputSchema.safeParse(payload);
  if (!parsed.success) {
    return c.json({ error: "invalid comment payload", issues: extractIssueItems(parsed.error) }, 400);
  }

  const comment = addTaskComment({
    taskId: c.req.param("id"),
    ...parsed.data,
  });

  return c.json({ comment }, 201);
});

app.get("/api/tasks/:id/activity", (c) => {
  const task = getTaskById(c.req.param("id"));
  if (!task) return c.json({ error: "task not found" }, 404);
  const activity = getTaskActivity(c.req.param("id"));
  return c.json({ ok: true, ...activity });
});

app.get("/api/tasks/:id/deps", (c) => {
  const task = getTaskById(c.req.param("id"));
  if (!task) return c.json({ error: "task not found" }, 404);
  const dependencies = getTaskDependencies(c.req.param("id"));
  return c.json({ dependencies });
});

app.post("/api/tasks/:id/deps", async (c) => {
  const task = getTaskById(c.req.param("id"));
  if (!task) return c.json({ error: "task not found" }, 404);

  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON payload" }, 400);
  }

  const parsed = createTaskDependencyInputSchema.safeParse(payload);
  if (!parsed.success) {
    return c.json({ error: "invalid dependency payload", issues: extractIssueItems(parsed.error) }, 400);
  }

  const dependency = addTaskDependency({
    taskId: c.req.param("id"),
    dependsOnTaskId: parsed.data.dependsOnTaskId,
  });

  return c.json({ dependency }, 201);
});

app.delete("/api/tasks/:id/deps/:depId", (c) => {
  const deleted = deleteTaskDependency(c.req.param("depId"));
  if (!deleted) return c.json({ error: "dependency not found" }, 404);
  return c.json({ ok: true });
});

app.get("/api/events", (c) => {
  const since = Number(c.req.query("since") ?? "0");
  if (Number.isFinite(since) && since > 0) {
    return c.json({ events: getEventsSince(since) });
  }
  return c.json({ events: getLatestEvents(80) });
});

// ── Activity (filtered + paginated) ─────────────────────────────────────────

app.get("/api/activity/stats", (c) => {
  const sinceParam = Number(c.req.query("since") ?? "0");
  const since = Number.isFinite(sinceParam) && sinceParam > 0
    ? sinceParam
    : Date.now() - 24 * 60 * 60_000;
  return c.json({ stats: getEventStats(since) });
});

app.get("/api/activity", (c) => {
  const type = c.req.query("type") || undefined;
  const agentId = c.req.query("agentId") || undefined;
  const source = c.req.query("source") || undefined;
  const since = Number(c.req.query("since") ?? "0") || undefined;
  const until = Number(c.req.query("until") ?? "0") || undefined;
  const limit = Number(c.req.query("limit") ?? "50") || undefined;
  const offset = Number(c.req.query("offset") ?? "0") || undefined;

  const result = getActivityEvents({ type, agentId, source, since, until, limit, offset });
  return c.json(result);
});

app.post("/api/events", async (c) => {
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON payload" }, 400);
  }

  const parsed = createEventSchema.safeParse(payload);
  if (!parsed.success) {
    return c.json(
      {
        error: "invalid event payload",
        issues: extractIssueItems(parsed.error),
      },
      400,
    );
  }

  const event = appendEvent({
    source: parsed.data.source,
    type: parsed.data.type,
    summary: parsed.data.summary,
    agentId: parsed.data.agentId ?? null,
    projectId: parsed.data.projectId ?? null,
    taskId: parsed.data.taskId ?? null,
    payloadJson: parsed.data.payloadJson,
  });

  publishEvent(event);

  writeAudit({
    action: "event.create",
    entityType: "event",
    entityId: event.id,
    after: event,
  });

  return c.json({ event });
});

app.post("/api/adapter/ingest", async (c) => {
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON payload" }, 400);
  }

  const parsed = ingestPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return c.json(
      {
        error: "invalid ingest payload",
        issues: extractIssueItems(parsed.error),
      },
      400,
    );
  }

  const events = "events" in parsed.data ? parsed.data.events : [parsed.data];

  const inserted = events.map((event) => {
    const row = appendEvent(event);
    publishEvent(row);
    return row;
  });

  writeAudit({
    action: "adapter.ingest",
    entityType: "event_batch",
    entityId: null,
    metadata: { ingested: inserted.length },
  });

  return c.json({ ingested: inserted.length, events: inserted });
});

app.get("/api/memory", (c) => {
  const container = c.req.query("container") as "journal" | "longterm" | "profile" | "lesson" | undefined;
  return c.json({ memory: getMemoryItems(container) });
});

app.get("/api/memory/search", (c) => {
  const q = c.req.query("q") ?? "";
  const container = c.req.query("container") as "journal" | "longterm" | "profile" | "lesson" | undefined;
  return c.json({ memory: searchMemoryItems(q, container) });
});

app.post("/api/memory", async (c) => {
  const body = await c.req.json<{
    container: "journal" | "longterm" | "profile" | "lesson";
    title: string;
    content: string;
    tags?: string[];
    sourceRef?: string;
    importance?: number;
    expiresAt?: number;
    memoryType?: "fact" | "preference" | "event" | "insight";
  }>();
  if (!body.container || !body.title || !body.content) {
    return c.json({ error: "container, title, content are required" }, 400);
  }
  const item = createMemoryItem(body);
  return c.json({ memory: item }, 201);
});

app.patch("/api/memory/:id", async (c) => {
  const id = c.req.param("id");
  const patch = await c.req.json<{
    title?: string;
    content?: string;
    tags?: string[];
    container?: "journal" | "longterm" | "profile" | "lesson";
    importance?: number;
    expiresAt?: number | null;
    memoryType?: "fact" | "preference" | "event" | "insight";
  }>();
  const item = updateMemoryItem(id, patch);
  if (!item) return c.json({ error: "not found" }, 404);
  return c.json({ memory: item });
});

app.delete("/api/memory/:id", (c) => {
  const id = c.req.param("id");
  const deleted = deleteMemoryItem(id);
  if (!deleted) return c.json({ error: "not found" }, 404);
  return c.json({ ok: true });
});

app.get("/api/docs", (c) => {
  const q = c.req.query("q") ?? "";
  return c.json({ docs: getDocs(q) });
});

// ── Skills Marketplace ──────────────────────────────────────────────────────

app.get("/api/skills", (c) => {
  const category = c.req.query("category") || undefined;
  const q = c.req.query("q") || undefined;
  return c.json({ skills: getSkills({ category, q }) });
});

app.get("/api/skills/by-id/:id", (c) => {
  const skill = getSkillById(c.req.param("id"));
  if (!skill) {
    return c.json({ error: "skill not found" }, 404);
  }
  return c.json({ skill });
});

app.put("/api/skills/by-name/:name", async (c) => {
  const name = c.req.param("name");
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON payload" }, 400);
  }

  const parsed = upsertSkillInputSchema.safeParse({ ...isRecord(payload) ? payload : {}, name });
  if (!parsed.success) {
    return c.json({ error: "invalid skill payload", issues: extractIssueItems(parsed.error) }, 400);
  }

  const skill = upsertSkill(parsed.data);
  writeAudit({
    action: "skill.upsert",
    entityType: "skill",
    entityId: skill.id,
    after: skill,
  });
  return c.json({ skill });
});

app.get("/api/agents/:id/skills", (c) => {
  const agentId = c.req.param("id");
  const agent = getAgentById(agentId);
  if (!agent) {
    return c.json({ error: "agent not found" }, 404);
  }
  return c.json({ skills: getAgentSkills(agentId) });
});

app.post("/api/agents/:id/skills", async (c) => {
  const agentId = c.req.param("id");
  const agent = getAgentById(agentId);
  if (!agent) {
    return c.json({ error: "agent not found" }, 404);
  }

  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON payload" }, 400);
  }

  const parsed = installSkillInputSchema.safeParse(payload);
  if (!parsed.success) {
    return c.json({ error: "invalid install payload", issues: extractIssueItems(parsed.error) }, 400);
  }

  const agentSkill = installSkillToAgent({ agentId, skillName: parsed.data.skillName });

  // Gateway best-effort 동기화: agent.skills 배열 업데이트
  let gatewayResult: { ok: boolean; result?: unknown; error?: string } | null = null;
  try {
    const currentSkills = getAgentSkills(agentId).map((s) => s.skillName);
    updateAgent(agentId, { skills: currentSkills });
    const result = await gatewayRpcClient.agentsUpdate({ agentId, skills: currentSkills });
    gatewayResult = { ok: true, result };
  } catch (error) {
    gatewayResult = { ok: false, error: getErrorMessage(error) };
  }

  writeAudit({
    action: "skill.install",
    entityType: "agent_skill",
    entityId: agentSkill.id,
    after: agentSkill,
    metadata: { gatewayResult },
  });

  return c.json({ agentSkill, gateway: gatewayResult }, 201);
});

app.delete("/api/agents/:id/skills/:skillName", async (c) => {
  const agentId = c.req.param("id");
  const skillName = c.req.param("skillName");
  const agent = getAgentById(agentId);
  if (!agent) {
    return c.json({ error: "agent not found" }, 404);
  }

  const removed = removeSkillFromAgent(agentId, skillName);
  if (!removed) {
    return c.json({ error: "skill not installed on agent" }, 404);
  }

  // Gateway best-effort 동기화
  let gatewayResult: { ok: boolean; result?: unknown; error?: string } | null = null;
  try {
    const currentSkills = getAgentSkills(agentId).map((s) => s.skillName);
    updateAgent(agentId, { skills: currentSkills });
    const result = await gatewayRpcClient.agentsUpdate({ agentId, skills: currentSkills });
    gatewayResult = { ok: true, result };
  } catch (error) {
    gatewayResult = { ok: false, error: getErrorMessage(error) };
  }

  writeAudit({
    action: "skill.remove",
    entityType: "agent_skill",
    entityId: `${agentId}:${skillName}`,
    metadata: { agentId, skillName, gatewayResult },
  });

  return c.json({ ok: true, gateway: gatewayResult });
});

app.post("/api/skills/sync", async (c) => {
  const agents = getAgents({ includeInactive: true });
  const results: Array<{ agentId: string; agentName: string; skills: string[]; error?: string }> = [];

  for (const agent of agents) {
    try {
      // Gateway agents.list에서 스킬 정보 가져오기
      const gatewaySkills = agent.skills ?? [];

      syncAgentSkillsFromGateway(agent.id, gatewaySkills);

      // 스킬 레지스트리 업데이트
      for (const skillName of gatewaySkills) {
        upsertSkillRegistry(skillName, agent.id);
      }

      results.push({ agentId: agent.id, agentName: agent.name, skills: gatewaySkills });
    } catch (error) {
      results.push({
        agentId: agent.id,
        agentName: agent.name,
        skills: [],
        error: getErrorMessage(error),
      });
    }
  }

  writeAudit({
    action: "skill.sync",
    entityType: "skill",
    metadata: { syncedAgents: results.length },
  });

  return c.json({ synced: results });
});

app.get("/api/skill-registry", (c) => {
  return c.json({ registry: getSkillRegistry() });
});

// ── Obsidian Vault ──────────────────────────────────────────────────────────

/* 첨부파일 바이너리 서빙 */
app.get("/api/vault/files/*", async (c) => {
  try {
    const prefix = "/api/vault/files/";
    const relPath = c.req.path.startsWith(prefix)
      ? decodeURIComponent(c.req.path.slice(prefix.length))
      : "";
    if (!relPath) return c.json({ error: "path required" }, 400);
    const { data, mimeType } = await readVaultFile(relPath);
    c.header("Content-Type", mimeType);
    c.header("Cache-Control", "public, max-age=86400");
    if (mimeType === "image/svg+xml") {
      c.header("Content-Security-Policy", "sandbox");
    }
    return c.body(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer);
  } catch (error) {
    const msg = getErrorMessage(error);
    if (msg.includes("not configured")) return c.json({ error: "vault not configured" }, 503);
    if (msg.includes("traversal")) return c.json({ error: "not found" }, 404);
    if (msg.includes("unsupported")) return c.json({ error: "unsupported file type" }, 415);
    if (msg.includes("ENOENT")) return c.json({ error: "not found" }, 404);
    return c.json({ error: msg }, 500);
  }
});

app.get("/api/vault/notes", async (c) => {
  try {
    const notes = await listVaultNotes();
    return c.json({ notes });
  } catch (error) {
    if (getErrorMessage(error).includes("not configured")) {
      return c.json({ error: "vault not configured" }, 503);
    }
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

app.post("/api/vault/sync", async (c) => {
  try {
    const sync = await runVaultSync();
    const notes = await listVaultNotes();

    writeAudit({
      action: "vault.sync",
      entityType: "vault",
      entityId: "obsidian-vault",
      after: {
        durationMs: sync.durationMs,
        scriptPath: sync.scriptPath,
        noteCount: notes.length,
      },
    });
    const event = appendEvent({
      type: "vault.sync",
      source: "vulcan-api",
      summary: `볼트 동기화 완료 (${notes.length}개 노트)`,
      payloadJson: JSON.stringify({
        durationMs: sync.durationMs,
        noteCount: notes.length,
      }),
    });
    publishEvent(event);

    return c.json({
      ok: true,
      message: "NAS와 볼트 동기화 완료",
      sync,
      notes,
    });
  } catch (error) {
    const msg = getErrorMessage(error);
    console.error("[vulcan-api] vault sync failed", error);
    if (msg.includes("not configured")) return c.json({ error: "vault not configured" }, 503);
    if (msg.includes("ENOENT") || msg.includes("EACCES")) {
      return c.json({ error: "vault sync script unavailable" }, 500);
    }
    if (msg.toLowerCase().includes("timed out")) {
      return c.json({ error: "vault sync timed out" }, 504);
    }
    return c.json({ error: "vault sync failed" }, 500);
  }
});

app.get("/api/vault/notes/*", async (c) => {
  try {
    const prefix = "/api/vault/notes/";
    const relPath = c.req.path.startsWith(prefix)
      ? decodeURIComponent(c.req.path.slice(prefix.length))
      : "";
    if (!relPath) return c.json({ error: "path required" }, 400);
    const note = await readVaultNote(relPath);
    return c.json({ note });
  } catch (error) {
    const msg = getErrorMessage(error);
    if (msg.includes("not configured")) return c.json({ error: "vault not configured" }, 503);
    if (msg.includes("traversal")) return c.json({ error: "not found" }, 404);
    if (msg.includes("ENOENT")) return c.json({ error: "not found" }, 404);
    return c.json({ error: msg }, 500);
  }
});

app.post("/api/vault/search", async (c) => {
  try {
    const body = await c.req.json();
    const q = isRecord(body) && typeof body.q === "string" ? body.q : "";
    if (!q) return c.json({ error: "q is required" }, 400);
    const results = await searchVaultNotesWithSnippet(q);
    return c.json({ results });
  } catch (error) {
    if (getErrorMessage(error).includes("not configured")) {
      return c.json({ error: "vault not configured" }, 503);
    }
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

app.post("/api/vault/clip", async (c) => {
  try {
    const body = await c.req.json();
    const url = isRecord(body) && typeof body.url === "string" ? body.url : "";
    if (!url) return c.json({ error: "url is required" }, 400);
    const result = await clipUrlToVault(url);
    writeAudit({
      action: "vault.clip",
      entityType: "vault_note",
      entityId: result.savedPath,
      after: result,
    });
    const event = appendEvent({
      type: "vault.clip",
      source: "vulcan-api",
      summary: `클리핑 저장: ${result.title}`,
      payloadJson: JSON.stringify(result),
    });
    publishEvent(event);
    return c.json({ clip: result });
  } catch (error) {
    if (getErrorMessage(error).includes("not configured")) {
      return c.json({ error: "vault not configured" }, 503);
    }
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

app.put("/api/vault/notes/*", async (c) => {
  try {
    const prefix = "/api/vault/notes/";
    const relPath = c.req.path.startsWith(prefix)
      ? decodeURIComponent(c.req.path.slice(prefix.length))
      : "";
    if (!relPath) return c.json({ error: "path required" }, 400);
    const body = await c.req.json();
    const content = isRecord(body) && typeof body.content === "string" ? body.content : null;
    if (content === null) return c.json({ error: "content is required" }, 400);
    const frontmatter = isRecord(body) && isRecord(body.frontmatter)
      ? (body.frontmatter as Record<string, unknown>)
      : undefined;
    const note = await writeVaultNote(relPath, content, frontmatter);
    writeAudit({
      action: "vault.update",
      entityType: "vault_note",
      entityId: relPath,
      after: { path: note.path, title: note.title },
    });
    const event = appendEvent({
      type: "vault.update",
      source: "vulcan-api",
      summary: `노트 수정: ${note.title}`,
      payloadJson: JSON.stringify({ path: note.path, title: note.title }),
    });
    publishEvent(event);
    return c.json({ note });
  } catch (error) {
    const msg = getErrorMessage(error);
    if (msg.includes("not configured")) return c.json({ error: "vault not configured" }, 503);
    if (msg.includes("traversal")) return c.json({ error: "not found" }, 404);
    if (msg.includes("ENOENT")) return c.json({ error: "not found" }, 404);
    return c.json({ error: msg }, 500);
  }
});

app.post("/api/vault/notes", async (c) => {
  try {
    const body = await c.req.json();
    const path = isRecord(body) && typeof body.path === "string" ? body.path : "";
    if (!path) return c.json({ error: "path is required" }, 400);
    const content = isRecord(body) && typeof body.content === "string" ? body.content : "";
    const frontmatter = isRecord(body) && isRecord(body.frontmatter)
      ? (body.frontmatter as Record<string, unknown>)
      : undefined;
    const note = await createVaultNote(path, content, frontmatter);
    writeAudit({
      action: "vault.create",
      entityType: "vault_note",
      entityId: path,
      after: { path: note.path, title: note.title },
    });
    const event = appendEvent({
      type: "vault.create",
      source: "vulcan-api",
      summary: `노트 생성: ${note.title}`,
      payloadJson: JSON.stringify({ path: note.path, title: note.title }),
    });
    publishEvent(event);
    return c.json({ note }, 201);
  } catch (error) {
    const msg = getErrorMessage(error);
    if (msg.includes("not configured")) return c.json({ error: "vault not configured" }, 503);
    if (msg.includes("traversal")) return c.json({ error: "not found" }, 404);
    if (msg.includes("already exists")) return c.json({ error: "already exists" }, 409);
    return c.json({ error: msg }, 500);
  }
});

app.delete("/api/vault/notes/*", async (c) => {
  try {
    const prefix = "/api/vault/notes/";
    const relPath = c.req.path.startsWith(prefix)
      ? decodeURIComponent(c.req.path.slice(prefix.length))
      : "";
    if (!relPath) return c.json({ error: "path required" }, 400);
    await deleteVaultNote(relPath);
    writeAudit({
      action: "vault.delete",
      entityType: "vault_note",
      entityId: relPath,
    });
    const event = appendEvent({
      type: "vault.delete",
      source: "vulcan-api",
      summary: `노트 삭제: ${relPath}`,
      payloadJson: JSON.stringify({ path: relPath }),
    });
    publishEvent(event);
    return c.json({ ok: true });
  } catch (error) {
    const msg = getErrorMessage(error);
    if (msg.includes("not configured")) return c.json({ error: "vault not configured" }, 503);
    if (msg.includes("traversal")) return c.json({ error: "not found" }, 404);
    if (msg.includes("ENOENT")) return c.json({ error: "not found" }, 404);
    return c.json({ error: msg }, 500);
  }
});

app.patch("/api/vault/notes/*", async (c) => {
  try {
    const prefix = "/api/vault/notes/";
    const relPath = c.req.path.startsWith(prefix)
      ? decodeURIComponent(c.req.path.slice(prefix.length))
      : "";
    if (!relPath) return c.json({ error: "path required" }, 400);
    const body = await c.req.json();
    const newPath = isRecord(body) && typeof body.newPath === "string" ? body.newPath : "";
    if (!newPath) return c.json({ error: "newPath is required" }, 400);
    const note = await renameVaultNote(relPath, newPath);
    writeAudit({
      action: "vault.rename",
      entityType: "vault_note",
      entityId: relPath,
      after: { oldPath: relPath, newPath: note.path, title: note.title },
    });
    const event = appendEvent({
      type: "vault.rename",
      source: "vulcan-api",
      summary: `노트 이름 변경: ${relPath} → ${note.path}`,
      payloadJson: JSON.stringify({ oldPath: relPath, newPath: note.path }),
    });
    publishEvent(event);
    return c.json({ note });
  } catch (error) {
    const msg = getErrorMessage(error);
    if (msg.includes("not configured")) return c.json({ error: "vault not configured" }, 503);
    if (msg.includes("traversal")) return c.json({ error: "not found" }, 404);
    if (msg.includes("ENOENT")) return c.json({ error: "not found" }, 404);
    if (msg.includes("already exists")) return c.json({ error: "already exists" }, 409);
    return c.json({ error: msg }, 500);
  }
});

app.post("/api/vault/upload", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return c.json({ error: "file is required" }, 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await uploadToVault(file.name, buffer);

    writeAudit({
      action: "vault.upload",
      entityType: "vault_attachment",
      entityId: result.relativePath,
      after: result,
    });
    const event = appendEvent({
      type: "vault.upload",
      source: "vulcan-api",
      summary: `첨부 업로드: ${result.fileName}`,
      payloadJson: JSON.stringify(result),
    });
    publishEvent(event);
    return c.json(result, 201);
  } catch (error) {
    const msg = getErrorMessage(error);
    if (msg.includes("not configured")) return c.json({ error: "vault not configured" }, 503);
    if (msg.includes("traversal")) return c.json({ error: "invalid file path" }, 400);
    return c.json({ error: msg }, 500);
  }
});

app.get("/api/schedule", (c) => c.json({ schedules: getSchedules() }));
app.get("/api/gateways", (c) => c.json({ gateways: getGateways() }));
app.get("/api/audit", (c) => {
  const action = c.req.query("action") || undefined;
  const entityType = c.req.query("entityType") || undefined;
  const entityId = c.req.query("entityId") || undefined;
  const since = Number(c.req.query("since") ?? "0") || undefined;
  const until = Number(c.req.query("until") ?? "0") || undefined;
  const limit = Number(c.req.query("limit") ?? "80") || undefined;
  const offset = Number(c.req.query("offset") ?? "0") || undefined;

  if (!action && !entityType && !entityId && !since && !until && !offset) {
    const safeLimit = typeof limit === "number" && Number.isFinite(limit) && limit > 0 ? Math.min(limit, 300) : 80;
    return c.json({ logs: getAuditLogs(safeLimit) });
  }

  const result = getAuditLogsFiltered({ action, entityType, entityId, since, until, limit, offset });
  return c.json(result);
});

app.get("/api/gateway/status", (c) => {
  const gateway = gatewayRpcClient.getStatus();
  const gatewayRow = upsertGateway({
    id: "openclaw-main",
    name: "OpenClaw Gateway",
    url: gateway.url,
    protocol: "ws-rpc-v3",
    status: gateway.connected ? "connected" : gateway.connecting ? "connecting" : "disconnected",
    lastSeenAt: gateway.lastConnectedAt,
  });
  return c.json({ gateway, gatewayRow });
});

app.post("/api/gateway/rpc", async (c) => {
  const parsed = await parseGatewayParams(c);
  if (!parsed.ok) {
    return c.json({ error: parsed.error }, 400);
  }

  const { method, params } = parsed.payload;
  if (typeof method !== "string" || !method.trim()) {
    return c.json({ error: "method must be a non-empty string" }, 400);
  }

  try {
    const result = await gatewayRpcClient.call(method, params ?? {});
    return c.json({ ok: true, result });
  } catch (error) {
    return c.json(
      {
        ok: false,
        error: getErrorMessage(error),
      },
      502,
    );
  }
});

app.get("/api/gateway/agents", async (c) => {
  try {
    const params = getGatewayQueryParams(c.req.url);
    const agents = await gatewayRpcClient.agentsList(params);
    return c.json({ agents });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 502);
  }
});

app.post("/api/gateway/chat/send", async (c) => {
  const parsed = await parseGatewayParams(c);
  if (!parsed.ok) {
    return c.json({ error: parsed.error }, 400);
  }

  try {
    const result = await gatewayRpcClient.chatSend(parsed.payload);
    return c.json({ result });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 502);
  }
});

app.post("/api/gateway/chat/abort", async (c) => {
  const parsed = await parseGatewayParams(c);
  if (!parsed.ok) {
    return c.json({ error: parsed.error }, 400);
  }

  try {
    const result = await gatewayRpcClient.chatAbort(parsed.payload);
    return c.json({ result });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 502);
  }
});

app.get("/api/gateway/sessions", async (c) => {
  try {
    const params = getGatewayQueryParams(c.req.url);
    const sessions = await gatewayRpcClient.sessionsList(params);
    return c.json({ sessions });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 502);
  }
});

app.post("/api/gateway/sessions/spawn", async (c) => {
  const parsed = await parseGatewayParams(c);
  if (!parsed.ok) {
    return c.json({ error: parsed.error }, 400);
  }

  try {
    const to = normalizeSessionKey(parsed.payload.to);
    const message =
      typeof parsed.payload.message === "string" ? parsed.payload.message.trim() : "";
    const taskLabel =
      typeof parsed.payload.task === "string" ? parsed.payload.task.trim() : undefined;
    const from = normalizeSessionKey(parsed.payload.from) ?? "hermes";

    if (!to || !message) {
      return c.json({ error: "sessions.spawn requires non-empty to/message" }, 400);
    }

    const sessionKey = await resolveGatewaySessionKeyForAgent(from, getAgentById(from)?.config);
    if (!sessionKey) {
      return c.json({ error: `gateway session key not resolved for from=${from}` }, 502);
    }

    const relayMessage = buildDelegateRelayMessage({
      targetAgentId: to,
      taskLabel,
      message,
    });

    const result = await gatewayRpcClient.chatSend({
      sessionKey,
      message: relayMessage,
      idempotencyKey: buildGatewayIdempotencyKey(parsed.payload.idempotencyKey, "session-spawn"),
    });
    return c.json({ result, resolved: { sessionKey, from, to } });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 502);
  }
});

app.post("/api/gateway/sessions/send", async (c) => {
  const parsed = await parseGatewayParams(c);
  if (!parsed.ok) {
    return c.json({ error: parsed.error }, 400);
  }

  try {
    const to = normalizeSessionKey(parsed.payload.to);
    const message =
      typeof parsed.payload.message === "string" ? parsed.payload.message.trim() : "";

    if (!to || !message) {
      return c.json({ error: "sessions.send requires non-empty to/message" }, 400);
    }

    const sessionKey = await resolveGatewaySessionKeyForAgent(to, getAgentById(to)?.config);
    if (!sessionKey) {
      return c.json({ error: `gateway session key not resolved for to=${to}` }, 502);
    }

    const result = await gatewayRpcClient.chatSend({
      sessionKey,
      message,
      idempotencyKey: buildGatewayIdempotencyKey(parsed.payload.idempotencyKey, "session-send"),
    });
    return c.json({ result, resolved: { sessionKey, to } });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 502);
  }
});

app.patch("/api/gateway/sessions", async (c) => {
  const parsed = await parseGatewayParams(c);
  if (!parsed.ok) {
    return c.json({ error: parsed.error }, 400);
  }

  try {
    const result = await gatewayRpcClient.sessionsPatch(parsed.payload);
    return c.json({ result });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 502);
  }
});

app.post("/api/gateway/sessions/reset", async (c) => {
  const parsed = await parseGatewayParams(c);
  if (!parsed.ok) {
    return c.json({ error: parsed.error }, 400);
  }

  try {
    const result = await gatewayRpcClient.sessionsReset(parsed.payload);
    return c.json({ result });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 502);
  }
});

app.get("/api/gateway/config", async (c) => {
  try {
    const params = getGatewayQueryParams(c.req.url);
    const config = await gatewayRpcClient.configGet(params);
    return c.json({ config });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 502);
  }
});

app.patch("/api/gateway/config", async (c) => {
  const parsed = await parseGatewayParams(c);
  if (!parsed.ok) {
    return c.json({ error: parsed.error }, 400);
  }

  try {
    const result = await gatewayRpcClient.configPatch(parsed.payload);
    return c.json({ result });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 502);
  }
});

app.get("/api/gateway/cron", async (c) => {
  try {
    const params = getGatewayQueryParams(c.req.url);
    const cron = await gatewayRpcClient.cronList(params);
    return c.json({ cron });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 502);
  }
});

app.get("/api/gateway/cron/status", async (c) => {
  try {
    const params = getGatewayQueryParams(c.req.url);
    const status = await gatewayRpcClient.cronStatus(params);
    return c.json({ status });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 502);
  }
});

app.get(
  WS_PATH,
  upgradeWebSocket(() => {
    let unsubscribe: (() => void) | null = null;
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    const release = () => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }
    };

    return {
      onOpen(_event, ws) {
        wsClientCount += 1;

        const seed = getLatestEvents(8);
        for (const event of seed) {
          sendWsMessage(ws, { type: "event", payload: event });
        }

        sendWsMessage(ws, {
          type: "ack",
          payload: { kind: "ready", ts: Date.now() },
        });

        unsubscribe = subscribeEvents((event) => {
          sendWsMessage(ws, { type: "event", payload: event });
        });

        heartbeat = setInterval(() => {
          sendWsMessage(ws, {
            type: "ack",
            payload: { kind: "heartbeat", ts: Date.now() },
          });
        }, 15_000);
      },
      onMessage(event, ws) {
        let payload: unknown;
        try {
          payload = JSON.parse(String(event.data));
        } catch {
          sendWsMessage(ws, {
            type: "error",
            payload: { message: "invalid JSON payload" },
          });
          return;
        }

        const parsed = realtimeClientMessageSchema.safeParse(payload);
        if (!parsed.success) {
          sendWsMessage(ws, {
            type: "error",
            payload: { message: "invalid command payload" },
          });
          return;
        }

        if (parsed.data.payload.command === "ping") {
          sendWsMessage(ws, {
            type: "ack",
            payload: {
              kind: "pong",
              ts: Date.now(),
              requestId: parsed.data.payload.requestId,
            },
          });
        }
      },
      onClose() {
        wsClientCount = Math.max(0, wsClientCount - 1);
        release();
      },
      onError(_event, ws) {
        sendWsMessage(ws, {
          type: "error",
          payload: { message: "websocket runtime error" },
        });
      },
    };
  }),
);

app.get("/api/stream", (c) => {
  return streamSSE(c, async (stream) => {
    const seed = getLatestEvents(8);
    for (const event of seed) {
      await stream.writeSSE({ data: JSON.stringify(event) });
    }

    await stream.writeSSE({ event: "ready", data: JSON.stringify({ ok: true }) });

    const unsubscribe = subscribeEvents((event) => {
      void stream.writeSSE({ data: JSON.stringify(event) });
    });

    const heartbeat = setInterval(() => {
      void stream.writeSSE({ event: "heartbeat", data: JSON.stringify({ ts: Date.now() }) });
    }, 15_000);

    await new Promise<void>((resolve) => {
      stream.onAbort(() => {
        unsubscribe();
        clearInterval(heartbeat);
        resolve();
      });
    });
  });
});

async function checkPostgres() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) {
    return { ok: null, status: "not_configured" };
  }

  const client = new Client({ connectionString: url, connectionTimeoutMillis: 2_000 });
  try {
    await client.connect();
    await client.query("select 1");
    return { ok: true, status: "connected" };
  } catch (error) {
    return {
      ok: false,
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function checkRedis() {
  const commandQueue = getCommandQueue();
  const healthcheckQueue = getHealthcheckQueue();
  if (!commandQueue || !healthcheckQueue) {
    return { ok: null, status: "not_configured" };
  }

  try {
    const client = await commandQueue.client;
    const ping = await client.ping();
    const ok = ping === "PONG";
    return {
      ok,
      status: ok ? "connected" : "error",
      workers: queueWorkersReady,
      queues: {
        command: commandQueue.name,
        healthcheck: healthcheckQueue.name,
      },
    };
  } catch (error) {
    return {
      ok: false,
      status: "error",
      error: error instanceof Error ? error.message : String(error),
      workers: queueWorkersReady,
      queues: {
        command: commandQueue.name,
        healthcheck: healthcheckQueue.name,
      },
    };
  }
}

// ── Notification API (Phase 7) ──────────────────────────────────────────────

app.get("/api/notifications/preferences", (c) => {
  const prefs = getNotificationPreferences();
  return c.json({ preferences: prefs });
});

app.put("/api/notifications/preferences", async (c) => {
  const body = await c.req.json();
  const parsed = updateNotificationPreferencesSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const prefs = upsertNotificationPreferences(parsed.data);
  return c.json({ preferences: prefs });
});

app.post("/api/notifications/test", async (c) => {
  const prefs = getNotificationPreferences();
  const chatId = prefs?.chatId || getDefaultNotificationChatId();
  if (!chatId) {
    return c.json({ error: "No chat ID configured" }, 400);
  }

  const testMessage = `<b>🔔 Vulcan Test Alert</b>\n테스트 알림입니다. 정상 동작 확인.\n<b>시각:</b> ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`;
  const result = await sendTelegramMessage(chatId, testMessage);

  appendNotificationLog({
    chatId,
    eventType: "system.test",
    message: testMessage,
    status: result.ok ? "sent" : "failed",
    error: result.error,
  });

  if (!result.ok) {
    return c.json({ ok: false, error: result.error }, 502);
  }

  return c.json({ ok: true, chatId });
});

app.get("/api/notifications/logs", (c) => {
  const limit = Number(c.req.query("limit") || "50");
  const logs = getNotificationLogs(limit);
  return c.json({ logs });
});

app.get("/api/health", async (c) => {
  const runtime = getRuntimeInfo();
  const gateway = gatewayRpcClient.getStatus();
  const gatewayRow = upsertGateway({
    id: "openclaw-main",
    name: "OpenClaw Gateway",
    url: gateway.url,
    protocol: "ws-rpc-v3",
    status: gateway.connected ? "connected" : gateway.connecting ? "connecting" : "disconnected",
    lastSeenAt: gateway.lastConnectedAt,
  });

  let sqliteOk = true;
  let sqliteError: string | undefined;
  try {
    ensureSchema();
    getSqlite().prepare("SELECT 1").get();
  } catch (error) {
    sqliteOk = false;
    sqliteError = error instanceof Error ? error.message : String(error);
  }

  const [postgres, redis] = await Promise.all([checkPostgres(), checkRedis()]);

  const payload = {
    ok: sqliteOk && (postgres.ok !== false) && (redis.ok !== false),
    build: runtime.build,
    gitSha: runtime.gitSha,
    uptimeMs: runtime.uptimeMs,
    sqlite: {
      ok: sqliteOk,
      error: sqliteError,
    },
    postgres,
    redis,
    gateway,
    gatewayRow,
    sseOk: true,
    streamSubscribers: getSubscriberCount(),
    sseSubscribers: getSubscriberCount(),
    wsClients: wsClientCount,
    records: countRecords(),
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    port: process.env.VULCAN_API_PORT ?? "8787",
  };

  const status = payload.ok ? 200 : 503;
  return c.json(payload, status);
});

// ── Approval / Governance API (Phase 8) ────────────────────────────────────

// 승인 알림 Telegram 발송
async function sendApprovalNotification(
  approval: Approval,
  policy: { name: string },
  agentId: string,
  mode: string,
  message: string,
) {
  try {
    const chatId = getDefaultNotificationChatId();
    if (!chatId) return;
    const text = formatApprovalRequestMessage({
      approvalId: approval.id,
      agentId,
      mode,
      policyName: policy.name,
      messagePreview: message.slice(0, 200),
    });
    const replyMarkup = getApprovalInlineKeyboard(approval.id);
    const result = await sendTelegramMessage(chatId, text, "HTML", replyMarkup);
    if (result.ok && result.messageId) {
      updateApprovalTelegramMessageId(approval.id, result.messageId);
    }
  } catch (err) {
    console.error("[vulcan-api] approval notification failed", err);
  }
}

// 승인 결과를 Telegram 메시지에 반영
async function updateApprovalTelegramMsg(
  approval: Approval,
  action: "approve" | "reject" | "auto_approve",
  resolvedBy?: string,
) {
  if (!approval.telegramMessageId) return;
  const chatId = getDefaultNotificationChatId();
  if (!chatId) return;

  try {
    const cmd = getAgentCommandById(approval.agentCommandId);
    let preview = "";
    if (cmd) {
      try { preview = (JSON.parse(cmd.payloadJson).message ?? "").slice(0, 200); } catch { /* ignore */ }
    }
    const text = formatApprovalRequestMessage({
      approvalId: approval.id,
      agentId: cmd?.agentId ?? "",
      mode: cmd?.mode ?? "",
      policyName: "",
      messagePreview: preview,
    });
    const resultText = formatApprovalResultMessage(text, action, resolvedBy);
    await editTelegramMessage(chatId, approval.telegramMessageId, resultText);
  } catch (err) {
    console.error("[vulcan-api] telegram message update failed", err);
  }
}

// 자동 승인 타임아웃 스케줄링
const approvalTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleApprovalTimeout(approvalId: string, delayMs: number) {
  const timer = setTimeout(() => {
    approvalTimeouts.delete(approvalId);
    void executeApprovalAutoApprove(approvalId);
  }, delayMs);
  approvalTimeouts.set(approvalId, timer);
}

async function executeApprovalAutoApprove(approvalId: string) {
  const approval = getApprovalById(approvalId);
  if (!approval || approval.status !== "pending") return;

  const resolved = resolveApproval(approvalId, {
    action: "approve",
    reason: "자동 승인 (타임아웃)",
    resolvedBy: "system",
  });

  writeAudit({
    action: "approval.auto_approved",
    entityType: "approval",
    entityId: approvalId,
    after: resolved,
    metadata: { commandId: approval.agentCommandId },
  });

  if (resolved) {
    void updateApprovalTelegramMsg(approval, "auto_approve", "system");
    await executeApprovedCommand(approval.agentCommandId);
  }
}

async function executeApprovedCommand(commandId: string) {
  const cmd = getAgentCommandById(commandId);
  if (!cmd) return;

  let payload: Record<string, unknown> = {};
  try { payload = JSON.parse(cmd.payloadJson); } catch { /* ignore */ }

  // BullMQ 큐 시도
  try {
    const queued = await enqueueCommandJob({
      commandId: cmd.id,
      mode: cmd.mode as "delegate" | "direct",
      agentId: cmd.agentId,
      message: (payload.message as string) ?? "",
      taskLabel: payload.taskLabel as string | undefined,
      to: payload.to as string | undefined,
      metadata: payload.metadata as Record<string, unknown> | undefined,
    });

    if (queued) {
      updateAgentCommand(cmd.id, { status: "queued" });
      writeAudit({
        action: `agent.${cmd.mode}.queued`,
        entityType: "agent_command",
        entityId: cmd.id,
        after: { ...cmd, status: "queued" },
        metadata: { queue: "bullmq", via: "approval_resolved" },
      });
      return;
    }
  } catch (error) {
    updateAgentCommand(cmd.id, {
      status: "failed",
      error: getErrorMessage(error),
      executedAt: Date.now(),
    });
    return;
  }

  // Redis 없을 때 inline 실행 폴백
  try {
    const message = (payload.message as string) ?? "";
    const targetAgentId = cmd.mode === "delegate"
      ? (payload.to as string) ?? "hermes"
      : cmd.agentId;

    let relayMessage = message;
    if (cmd.mode === "delegate") {
      relayMessage = buildDelegateRelayMessage({
        targetAgentId,
        taskLabel: payload.taskLabel as string | undefined,
        message,
      });
    }

    const sessionKey = await resolveGatewaySessionKeyForAgent(
      cmd.mode === "delegate" ? "hermes" : targetAgentId,
      getAgentById(cmd.mode === "delegate" ? "hermes" : targetAgentId)?.config,
    );

    if (!sessionKey) {
      throw new Error(`gateway session key not resolved for ${targetAgentId}`);
    }

    const gatewayResult = await gatewayRpcClient.chatSend({
      sessionKey,
      message: relayMessage,
      idempotencyKey: cmd.id,
    });

    updateAgentCommand(cmd.id, {
      status: "sent",
      gatewayCommandId: extractGatewayCommandId(gatewayResult),
      executedAt: Date.now(),
      error: null,
    });

    writeAudit({
      action: `agent.${cmd.mode}.sent`,
      entityType: "agent_command",
      entityId: cmd.id,
      after: { ...cmd, status: "sent" },
      metadata: { queue: "inline", via: "approval_resolved", gatewayResult },
    });
  } catch (error) {
    updateAgentCommand(cmd.id, {
      status: "failed",
      error: getErrorMessage(error),
      executedAt: Date.now(),
    });

    writeAudit({
      action: `agent.${cmd.mode}.failed`,
      entityType: "agent_command",
      entityId: cmd.id,
      after: { ...cmd, status: "failed" },
      metadata: { queue: "inline", via: "approval_resolved", error: getErrorMessage(error) },
    });
  }
}

// 서버 시작 시 pending 타임아웃 복구
function restorePendingApprovalTimeouts() {
  const pending = getPendingExpiredApprovals();
  for (const a of pending) {
    void executeApprovalAutoApprove(a.id);
  }
  // 아직 만료 안 된 pending 건들
  const allPending = getApprovals({ status: "pending", limit: 300 });
  for (const a of allPending) {
    if (a.expiresAt && a.expiresAt > Date.now()) {
      scheduleApprovalTimeout(a.id, a.expiresAt - Date.now());
    }
  }
}

// ── Telegram Polling 콜백 핸들러 ────────────────────────────────────────────

async function handleTelegramCallback(cbq: TelegramCallbackQuery): Promise<void> {
  if (!cbq.data || !cbq.message) return;

  // callback_data: "approval:{action}:{approvalId}"
  const parts = cbq.data.split(":");
  if (parts.length !== 3 || parts[0] !== "approval") return;

  const action = parts[1] as "approve" | "reject";
  const approvalId = parts[2];

  if (action !== "approve" && action !== "reject") return;

  const existing = getApprovalById(approvalId);
  if (!existing) {
    await answerCallbackQuery(cbq.id, "승인 요청을 찾을 수 없습니다");
    return;
  }

  if (existing.status !== "pending") {
    await answerCallbackQuery(cbq.id, `이미 처리됨: ${existing.status}`);
    return;
  }

  // 타임아웃 취소
  const timer = approvalTimeouts.get(approvalId);
  if (timer) {
    clearTimeout(timer);
    approvalTimeouts.delete(approvalId);
  }

  const resolved = resolveApproval(approvalId, {
    action,
    reason: action === "approve" ? "Telegram 승인" : "Telegram 거절",
    resolvedBy: "telegram",
  });

  writeAudit({
    action: `approval.${action === "approve" ? "approved" : "rejected"}`,
    entityType: "approval",
    entityId: approvalId,
    before: existing,
    after: resolved,
    metadata: { commandId: existing.agentCommandId, via: "telegram_inline_keyboard" },
  });

  // 버튼 클릭 피드백
  await answerCallbackQuery(
    cbq.id,
    action === "approve" ? "✅ 승인 처리됨" : "❌ 거절 처리됨",
  );

  // 메시지 업데이트 (버튼 제거 + 결과 표시)
  void updateApprovalTelegramMsg(
    { ...existing, telegramMessageId: cbq.message.message_id },
    action,
    "telegram",
  );

  if (action === "approve") {
    await executeApprovedCommand(existing.agentCommandId);
  } else {
    updateAgentCommand(existing.agentCommandId, {
      status: "failed",
      error: "승인 거절 (Telegram)",
      executedAt: Date.now(),
    });
  }
}

// 정책 CRUD
app.get("/api/approval-policies", (c) => {
  const policies = getApprovalPolicies();
  return c.json({ policies });
});

app.post("/api/approval-policies", async (c) => {
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON" }, 400);
  }
  const parsed = createApprovalPolicyInputSchema.safeParse(payload);
  if (!parsed.success) {
    return c.json({ error: "invalid input", issues: extractIssueItems(parsed.error) }, 400);
  }
  const policy = createApprovalPolicy(parsed.data);
  writeAudit({
    action: "approval_policy.created",
    entityType: "approval_policy",
    entityId: policy.id,
    after: policy,
  });
  return c.json({ policy }, 201);
});

app.put("/api/approval-policies/:id", async (c) => {
  const id = c.req.param("id");
  const existing = getApprovalPolicyById(id);
  if (!existing) return c.json({ error: "policy not found" }, 404);

  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON" }, 400);
  }
  const parsed = updateApprovalPolicyInputSchema.safeParse(payload);
  if (!parsed.success) {
    return c.json({ error: "invalid input", issues: extractIssueItems(parsed.error) }, 400);
  }
  const updated = updateApprovalPolicy(id, parsed.data);
  writeAudit({
    action: "approval_policy.updated",
    entityType: "approval_policy",
    entityId: id,
    before: existing,
    after: updated,
  });
  return c.json({ policy: updated });
});

// 승인 목록 / 대기 건수 / 단건 조회
app.get("/api/approvals", (c) => {
  const status = c.req.query("status") as "pending" | "approved" | "rejected" | "expired" | "all" | undefined;
  const limit = c.req.query("limit") ? Number(c.req.query("limit")) : undefined;
  const approvals = getApprovals({ status: status || undefined, limit });
  return c.json({ approvals });
});

app.get("/api/approvals/pending-count", (c) => {
  const count = getPendingApprovalCount();
  return c.json({ count });
});

app.get("/api/approvals/:id", (c) => {
  const id = c.req.param("id");
  const approval = getApprovalById(id);
  if (!approval) return c.json({ error: "approval not found" }, 404);
  return c.json({ approval });
});

// 승인/거절 resolve
app.post("/api/approvals/:id/resolve", async (c) => {
  const id = c.req.param("id");
  const existing = getApprovalById(id);
  if (!existing) return c.json({ error: "approval not found" }, 404);
  if (existing.status !== "pending") {
    return c.json({ error: `approval already ${existing.status}` }, 409);
  }

  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON" }, 400);
  }
  const parsed = resolveApprovalInputSchema.safeParse(payload);
  if (!parsed.success) {
    return c.json({ error: "invalid input", issues: extractIssueItems(parsed.error) }, 400);
  }

  // 타임아웃 취소
  const timer = approvalTimeouts.get(id);
  if (timer) {
    clearTimeout(timer);
    approvalTimeouts.delete(id);
  }

  const resolved = resolveApproval(id, {
    action: parsed.data.action,
    reason: parsed.data.reason,
  });

  writeAudit({
    action: `approval.${parsed.data.action === "approve" ? "approved" : "rejected"}`,
    entityType: "approval",
    entityId: id,
    before: existing,
    after: resolved,
    metadata: { commandId: existing.agentCommandId, reason: parsed.data.reason },
  });

  // Telegram 메시지 업데이트
  void updateApprovalTelegramMsg(existing, parsed.data.action, "web");

  if (parsed.data.action === "approve") {
    await executeApprovedCommand(existing.agentCommandId);
    return c.json({ approval: resolved, executed: true });
  }

  // reject → 커맨드 failed
  updateAgentCommand(existing.agentCommandId, {
    status: "failed",
    error: `승인 거절: ${parsed.data.reason ?? "사유 없음"}`,
    executedAt: Date.now(),
  });

  return c.json({ approval: resolved, executed: false });
});

app.get("/", (c) => c.json({ service: "vulcan-api", ok: true }));

// 테스트에서 app 인스턴스를 사용할 수 있도록 export
export { app };

// ── Trace / FinOps (Phase 11) ────────────────────────────────────────────────

app.post("/api/traces/ingest", async (c) => {
  const body = await c.req.json();
  const parsed = traceIngestPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: parsed.error.issues }, 400);
  }
  const traces = "traces" in parsed.data ? parsed.data.traces : [parsed.data];
  const results = [];
  const warnings: string[] = [];
  for (const t of traces) {
    const saved = appendTrace(t);
    results.push(saved);
    // Circuit breaker advisory check
    const cb = checkCircuitBreaker(t.agentId);
    if (cb.exceeded) {
      warnings.push(
        `[CB] ${t.agentId}: ${cb.usage.toLocaleString()}/${cb.limit.toLocaleString()} 토큰 상한 초과`,
      );
    }
    // 실시간 이벤트 전파
    publishEvent({
      id: saved.id,
      ts: saved.ts,
      source: "trace",
      agentId: saved.agentId,
      projectId: null,
      taskId: null,
      type: "trace.ingested",
      summary: `${saved.type} ${saved.model} ${saved.inputTokens + saved.outputTokens}tok $${saved.cost.toFixed(4)}`,
      payloadJson: JSON.stringify({ traceId: saved.traceId, status: saved.status }),
    });
  }
  return c.json({ ok: true, count: results.length, warnings });
});

app.get("/api/traces", (c) => {
  const since = Number(c.req.query("since") ?? Date.now() - 86400000);
  const agentId = c.req.query("agentId") || undefined;
  const limit = Math.min(Math.max(1, Number(c.req.query("limit") ?? 100) || 100), 1000);
  const traces = getTracesSince(since, agentId, limit);
  return c.json({ ok: true, traces, count: traces.length });
});

app.get("/api/traces/daily-cost", (c) => {
  const days = Math.min(Math.max(1, Number(c.req.query("days") ?? 0) || 0), 90);
  const since = days > 0
    ? Date.now() - days * 86_400_000
    : Number(c.req.query("since") ?? Date.now() - 7 * 86_400_000);
  const summaries = getDailyCostSummaries(since);
  return c.json({ ok: true, summaries });
});

app.get("/api/traces/cb-history", (c) => {
  const since = Number(c.req.query("since") ?? Date.now() - 30 * 86_400_000);
  const history = getCBTriggerHistory(since);
  return c.json({ ok: true, history });
});

app.get("/api/circuit-breaker", (c) => {
  const agentId = c.req.query("agentId");
  if (agentId) {
    const config = getCircuitBreakerConfig(agentId);
    if (!config) {
      return c.json({ ok: false, error: "not found" }, 404);
    }
    const status = checkCircuitBreaker(agentId);
    return c.json({ ok: true, config, status });
  }
  const configs = getAllCircuitBreakerConfigs();
  return c.json({ ok: true, configs });
});

app.put("/api/circuit-breaker", async (c) => {
  const body = await c.req.json();
  const parsed = circuitBreakerConfigInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: parsed.error.issues }, 400);
  }
  const config = upsertCircuitBreakerConfig(
    parsed.data.agentId,
    parsed.data.dailyTokenLimit,
    parsed.data.isActive ?? true,
  );
  return c.json({ ok: true, config });
});

// ── WorkOrder / WorkResult (Phase 3) ────────────────────────────────────────

const VALID_WO_TRANSITIONS: Record<string, string[]> = {
  pending: ["accepted", "in_progress", "cancelled"],
  accepted: ["in_progress", "cancelled"],
  in_progress: ["review", "completed", "failed", "cancelled"],
  review: ["completed", "failed", "in_progress"],
  completed: [],
  failed: ["pending"],  // retry 시 pending으로 복귀 가능
  cancelled: [],
};

function isValidWoTransition(from: string, to: string): boolean {
  return (VALID_WO_TRANSITIONS[from] ?? []).includes(to);
}

app.post("/api/work-orders", async (c) => {
  const body = await c.req.json();
  const parsed = createWorkOrderInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: parsed.error.issues }, 400);
  }

  // toAgentId 존재 검증
  const toAgent = getAgentById(parsed.data.toAgentId);
  if (!toAgent) {
    return c.json({ ok: false, error: `에이전트 없음: ${parsed.data.toAgentId}` }, 400);
  }

  const order = createWorkOrder(parsed.data);

  appendAuditLog({
    actor: parsed.data.fromAgentId,
    action: "work_order.created",
    entityType: "work_order",
    entityId: order.id,
    source: "api",
    afterJson: JSON.stringify(order),
  });

  publishEvent({
    id: randomUUID(),
    ts: Date.now(),
    source: "vulcan-api",
    agentId: parsed.data.toAgentId,
    projectId: parsed.data.project ?? null,
    taskId: parsed.data.linkedTaskId ?? null,
    type: "work_order.created",
    summary: `WorkOrder 생성: ${parsed.data.summary} (${parsed.data.fromAgentId} → ${parsed.data.toAgentId})`,
    payloadJson: JSON.stringify({ workOrderId: order.id }),
  });

  return c.json({ ok: true, workOrder: order }, 201);
});

app.get("/api/work-orders", (c) => {
  const { status, toAgentId, fromAgentId, project, limit } = c.req.query();
  const orders = listWorkOrders({
    status: status || undefined,
    toAgentId: toAgentId || undefined,
    fromAgentId: fromAgentId || undefined,
    project: project || undefined,
    limit: limit ? Math.min(Math.max(1, Number(limit) || 100), 500) : 100,
  });
  const stats = getWorkOrderStats();
  return c.json({ ok: true, workOrders: orders, stats });
});

app.get("/api/work-orders/:id", (c) => {
  const order = getWorkOrder(c.req.param("id"));
  if (!order) {
    return c.json({ ok: false, error: "not found" }, 404);
  }
  const results = getWorkResultsByOrderId(order.id);
  return c.json({ ok: true, workOrder: order, results });
});

app.patch("/api/work-orders/:id", async (c) => {
  const id = c.req.param("id");
  const existing = getWorkOrder(id);
  if (!existing) {
    return c.json({ ok: false, error: "not found" }, 404);
  }
  const body = await c.req.json();
  const parsed = updateWorkOrderInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: parsed.error.issues }, 400);
  }

  // 상태 전이 검증
  if (parsed.data.status && parsed.data.status !== existing.status) {
    if (!isValidWoTransition(existing.status, parsed.data.status)) {
      return c.json({
        ok: false,
        error: `상태 전이 불가: ${existing.status} → ${parsed.data.status}`,
      }, 400);
    }
  }

  const updates: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "completed" || parsed.data.status === "failed") {
    updates.completedAt = Date.now();
  }
  const updated = updateWorkOrder(id, updates);

  appendAuditLog({
    actor: "human",
    action: `work_order.${parsed.data.status ?? "updated"}`,
    entityType: "work_order",
    entityId: id,
    source: "api",
    beforeJson: JSON.stringify(existing),
    afterJson: JSON.stringify(updated),
  });

  if (parsed.data.status && parsed.data.status !== existing.status) {
    publishEvent({
      id: randomUUID(),
      ts: Date.now(),
      source: "vulcan-api",
      agentId: existing.toAgentId,
      projectId: existing.project ?? null,
      taskId: existing.linkedTaskId ?? null,
      type: `work_order.${parsed.data.status}`,
      summary: `WorkOrder [${existing.summary}] → ${parsed.data.status}`,
      payloadJson: JSON.stringify({ workOrderId: id }),
    });
  }

  return c.json({ ok: true, workOrder: updated });
});

app.post("/api/work-orders/:id/result", async (c) => {
  const id = c.req.param("id");
  const order = getWorkOrder(id);
  if (!order) {
    return c.json({ ok: false, error: "work order not found" }, 404);
  }

  // 완료/취소 상태에서는 result 제출 불가
  if (order.status === "completed" || order.status === "cancelled") {
    return c.json({ ok: false, error: `${order.status} 상태에서는 결과를 제출할 수 없습니다` }, 400);
  }

  const body = await c.req.json();
  const parsed = workResultInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: parsed.error.issues }, 400);
  }

  const result = createWorkResult({ ...parsed.data, workOrderId: id });

  // WorkOrder 상태 업데이트
  if (parsed.data.status === "completed") {
    updateWorkOrder(id, { status: "completed", completedAt: Date.now() });
  } else if (parsed.data.status === "failed" || parsed.data.status === "blocked") {
    // 자동 재시도 (1회)
    if (order.retryCount < 1 && parsed.data.status === "failed") {
      updateWorkOrder(id, {
        status: "pending",
        retryCount: order.retryCount + 1,
      });

      publishEvent({
        id: randomUUID(),
        ts: Date.now(),
        source: "vulcan-api",
        agentId: order.toAgentId,
        projectId: order.project ?? null,
        taskId: order.linkedTaskId ?? null,
        type: "work_order.retry",
        summary: `WorkOrder [${order.summary}] 자동 재시도 (${order.retryCount + 1}/1)`,
        payloadJson: JSON.stringify({ workOrderId: id, retryCount: order.retryCount + 1 }),
      });
    } else {
      // 재시도 초과 또는 blocked → CEO 에스컬레이션
      updateWorkOrder(id, { status: "failed", completedAt: Date.now() });

      const escalationMsg = `🚨 WorkOrder 실패 에스컬레이션\n` +
        `작업: ${order.summary}\n` +
        `담당: ${order.toAgentId}\n` +
        `상태: ${parsed.data.status}\n` +
        `사유: ${parsed.data.errorDetail ?? "N/A"}\n` +
        `재시도: ${order.retryCount}회`;

      // Telegram CEO 에스컬레이션 알림
      try {
        const chatId = getDefaultNotificationChatId();
        if (chatId) {
          const { sendTelegramMessage } = await import("./telegram");
          await sendTelegramMessage(chatId, escalationMsg);
        }
      } catch {
        console.error("[vulcan-api] Telegram 에스컬레이션 전송 실패");
      }

      publishEvent({
        id: randomUUID(),
        ts: Date.now(),
        source: "vulcan-api",
        agentId: order.toAgentId,
        projectId: order.project ?? null,
        taskId: order.linkedTaskId ?? null,
        type: "work_order.escalated",
        summary: `WorkOrder [${order.summary}] CEO 에스컬레이션 (${parsed.data.status})`,
        payloadJson: JSON.stringify({ workOrderId: id, errorDetail: parsed.data.errorDetail }),
      });
    }
  } else if (parsed.data.status === "partial") {
    updateWorkOrder(id, { status: "in_progress" });
  }

  appendAuditLog({
    actor: parsed.data.agentId,
    action: "work_result.submitted",
    entityType: "work_result",
    entityId: result.id,
    source: "api",
    afterJson: JSON.stringify(result),
    metadataJson: JSON.stringify({ workOrderId: id }),
  });

  return c.json({ ok: true, result });
});

app.post("/api/work-orders/:id/checkpoint", async (c) => {
  const id = c.req.param("id");
  const order = getWorkOrder(id);
  if (!order) {
    return c.json({ ok: false, error: "not found" }, 404);
  }
  const body = await c.req.json();
  const parsed = workOrderCheckpointInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: parsed.error.issues }, 400);
  }
  const updated = saveWorkOrderCheckpoint(id, parsed.data.checkpointJson);
  return c.json({ ok: true, workOrder: updated });
});

app.post("/api/work-orders/:id/verify", async (c) => {
  const id = c.req.param("id");
  const order = getWorkOrder(id);
  if (!order) {
    return c.json({ ok: false, error: "not found" }, 404);
  }

  // in_progress 또는 review 상태에서만 검증 요청 가능
  if (order.status !== "in_progress" && order.status !== "review") {
    return c.json({
      ok: false,
      error: `${order.status} 상태에서는 검증을 요청할 수 없습니다`,
    }, 400);
  }

  const verifierId = order.verifierAgentId ?? "argus";
  updateWorkOrder(id, { status: "review" });

  publishEvent({
    id: randomUUID(),
    ts: Date.now(),
    source: "vulcan-api",
    agentId: verifierId,
    projectId: order.project ?? null,
    taskId: order.linkedTaskId ?? null,
    type: "work_order.verify_requested",
    summary: `WorkOrder [${order.summary}] 검증 요청 → ${verifierId}`,
    payloadJson: JSON.stringify({
      workOrderId: id,
      acceptanceCriteria: order.acceptanceCriteria,
      verifierId,
    }),
  });

  appendAuditLog({
    actor: "system",
    action: "work_order.verify_requested",
    entityType: "work_order",
    entityId: id,
    source: "api",
    metadataJson: JSON.stringify({ verifierId }),
  });

  return c.json({ ok: true, message: `검증 요청 전송: ${verifierId}` });
});

// 직접 실행 시에만 서버 시작 (테스트에서 import할 때는 실행하지 않음)
const isDirectRun =
  process.argv[1]?.endsWith("server.ts") ||
  process.argv[1]?.endsWith("server.js");

if (isDirectRun) {
  const port = Number(process.env.VULCAN_API_PORT ?? "8787");

  const server = serve(
    {
      fetch: app.fetch,
      port,
      hostname: "127.0.0.1",
    },
    (info) => {
      console.log(`[vulcan-api] listening on http://${info.address}:${info.port}`);
    },
  );

  injectWebSocket(server);

  // Phase 11: 비용 알림 스케줄러
  scheduleDailyCostReport();

  // Phase 11: Circuit Breaker 기본값 시드
  {
    const cbDefaults: Record<string, number> = {
      hermes: 500_000,
      daedalus: 300_000,
      metis: 200_000,
      athena: 200_000,
      themis: 150_000,
      iris: 150_000,
      nike: 150_000,
      calliope: 150_000,
      aegis: 100_000,
      argus: 100_000,
    };
    const existing = getAllCircuitBreakerConfigs();
    const existingIds = new Set(existing.map((c) => c.agentId));
    for (const [agentId, limit] of Object.entries(cbDefaults)) {
      if (!existingIds.has(agentId)) {
        upsertCircuitBreakerConfig(agentId, limit);
        console.log(`[vulcan-api] CB 시드: ${agentId} → ${limit.toLocaleString()} tokens/day`);
      }
    }
  }

  let isShuttingDown = false;

  async function shutdown(signal: string) {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;

    console.log(`[vulcan-api] shutting down (${signal})`);

    if (healthcheckQueueTimer) {
      clearInterval(healthcheckQueueTimer);
      healthcheckQueueTimer = null;
    }
    if (costReportTimer) {
      clearInterval(costReportTimer);
      costReportTimer = null;
    }

    // Phase 8: 승인 타임아웃 정리
    for (const timer of approvalTimeouts.values()) {
      clearTimeout(timer);
    }
    approvalTimeouts.clear();

    stopTelegramPolling();
    gatewayRpcClient.stop();
    await closeQueueResources().catch((error) => {
      console.error("[vulcan-api] queue shutdown failed", error);
    });

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}
