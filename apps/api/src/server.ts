import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { cors } from "hono/cors";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { streamSSE } from "hono/streaming";
import {
  createAgentInputSchema,
  createEventSchema,
  delegateCommandInputSchema,
  directCommandInputSchema,
  ingestPayloadSchema,
  realtimeClientMessageSchema,
  taskLanePatchSchema,
  updateAgentInputSchema,
} from "@vulcan/shared/schemas";
import type {
  AgentCommand,
  AgentCommandStatus,
  RealtimeServerMessage,
} from "@vulcan/shared/types";
import {
  appendAuditLog,
  appendEvent,
  countRecords,
  createAgent,
  createAgentCommand,
  deactivateAgent,
  getAgentById,
  getAgentCommandById,
  getAgentCommands,
  getAgents,
  getAuditLogs,
  getDocs,
  getEventsSince,
  getGateways,
  getLatestEvents,
  getMemoryItems,
  getProjects,
  getSchedules,
  getTasks,
  updateAgent,
  updateAgentCommand,
  updateTaskLane,
  upsertGateway,
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
  getCommandQueue,
  getHealthcheckQueue,
  startQueueWorkers,
  type CommandQueueJobData,
} from "./queue";
import { getGatewayRpcClient } from "./gateway-rpc";

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

let healthcheckQueueTimer: ReturnType<typeof setInterval> | null = null;
let queueWorkersReady = false;
try {
  queueWorkersReady = startQueueWorkers({
    command: executeCommandQueueJob,
    healthcheck: executeHealthcheckQueueJob,
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

  const tasks = getTasks({
    lane: lane as "all" | "backlog" | "in_progress" | "review",
    q,
  });

  return c.json({ tasks });
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

app.get("/api/events", (c) => {
  const since = Number(c.req.query("since") ?? "0");
  if (Number.isFinite(since) && since > 0) {
    return c.json({ events: getEventsSince(since) });
  }
  return c.json({ events: getLatestEvents(80) });
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
  const container = c.req.query("container") as "journal" | "longterm" | undefined;
  return c.json({ memory: getMemoryItems(container) });
});

app.get("/api/docs", (c) => {
  const q = c.req.query("q") ?? "";
  return c.json({ docs: getDocs(q) });
});

app.get("/api/schedule", (c) => c.json({ schedules: getSchedules() }));
app.get("/api/gateways", (c) => c.json({ gateways: getGateways() }));
app.get("/api/audit", (c) => {
  const limit = Number(c.req.query("limit") ?? "80");
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 300) : 80;
  return c.json({ logs: getAuditLogs(safeLimit) });
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

app.get("/", (c) => c.json({ service: "vulcan-api", ok: true }));

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
