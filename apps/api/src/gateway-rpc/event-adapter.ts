import crypto from "node:crypto";
import type { IngestEventInput } from "@vulcan/shared/types";
import type { GatewayEventFrame } from "./types";

const MAX_SUMMARY_LENGTH = 190;
const MAX_PAYLOAD_JSON_BYTES = 16_000;
const IGNORED_EVENTS = new Set(["connect.challenge", "tick"]);
const KNOWN_AGENT_IDS = new Set(["hermes", "vesta", "atlas", "lyra", "aegis"]);

function truncate(input: string, max: number): string {
  if (input.length <= max) {
    return input;
  }
  return `${input.slice(0, Math.max(0, max - 1))}…`;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ note: "payload serialization failed" });
  }
}

function payloadToObject(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  return payload as Record<string, unknown>;
}

function extractFirstString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function normalizeAgentId(raw: string | null): string | null {
  if (!raw) {
    return null;
  }
  const normalized = raw.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (KNOWN_AGENT_IDS.has(normalized)) {
    return normalized;
  }
  return null;
}

function agentFromSessionKey(raw: string | null): string | null {
  if (!raw) {
    return null;
  }
  const matched = /^agent:([a-z0-9_-]+):/i.exec(raw.trim());
  if (!matched) {
    return null;
  }
  return normalizeAgentId(matched[1] ?? null);
}

export function detectAgentIdFromGatewayEvent(
  eventName: string,
  payload: unknown,
): string | null {
  const payloadRecord = payloadToObject(payload);
  if (!payloadRecord) {
    return null;
  }

  const direct = extractFirstString(payloadRecord, [
    "agentId",
    "agent",
    "ownerAgentId",
    "targetAgentId",
  ]);

  const fromDirect = normalizeAgentId(direct);
  if (fromDirect) {
    return fromDirect;
  }

  const fromSessionKey = agentFromSessionKey(
    extractFirstString(payloadRecord, ["sessionKey", "sourceSessionKey"]),
  );
  if (fromSessionKey) {
    return fromSessionKey;
  }

  const eventMatched = /^agent\.([a-z0-9_-]+)\./i.exec(eventName);
  if (eventMatched?.[1]) {
    return normalizeAgentId(eventMatched[1]);
  }

  return null;
}

export function mapGatewayEventNameToType(eventName: string, payload: unknown): string {
  const normalized = eventName.toLowerCase();
  const payloadRecord = payloadToObject(payload);
  const payloadLevel =
    payloadRecord && typeof payloadRecord.level === "string"
      ? payloadRecord.level.toLowerCase()
      : "";

  if (normalized.includes("error") || payloadLevel === "error") {
    return "error";
  }
  if (normalized.startsWith("chat") || normalized.includes(".chat") || normalized === "chat") {
    return "message";
  }
  if (
    normalized.includes("exec") ||
    normalized.includes("agent") ||
    normalized.includes("session") ||
    normalized.includes("tool")
  ) {
    return "tool_call";
  }
  if (
    normalized.includes("presence") ||
    normalized.includes("cron") ||
    normalized.includes("config") ||
    normalized.includes("device") ||
    normalized.includes("connect") ||
    normalized.includes("sync")
  ) {
    return "sync";
  }
  return "sync";
}

export function mapGatewayEventToIngest(frame: GatewayEventFrame): IngestEventInput | null {
  const eventName = frame.event.trim();
  if (!eventName || IGNORED_EVENTS.has(eventName)) {
    return null;
  }

  const payloadRecord = payloadToObject(frame.payload);
  const payloadSummary =
    payloadRecord &&
    extractFirstString(payloadRecord, [
      "summary",
      "message",
      "text",
      "reason",
      "statusLabel",
      "title",
    ]);

  const summary = truncate(
    `[gateway:${eventName}] ${payloadSummary ?? "gateway event received"}`,
    MAX_SUMMARY_LENGTH,
  );

  const type = mapGatewayEventNameToType(eventName, frame.payload);
  const agentId = detectAgentIdFromGatewayEvent(eventName, frame.payload);

  const payloadJson = safeStringify({
    event: eventName,
    payload: frame.payload ?? null,
    seq: frame.seq ?? null,
    stateVersion: frame.stateVersion ?? null,
  });

  return {
    source: "openclaw-gateway",
    type,
    summary,
    payloadJson: truncate(payloadJson, MAX_PAYLOAD_JSON_BYTES),
    agentId,
  };
}

// ── Trace 변환 ──────────────────────────────────────────────────────────────

const COMPLETION_EVENT_PATTERNS = [
  "completion",
  "response",
  "chat.reply",
  "agent.reply",
  "llm.response",
  "llm.completion",
];

export interface TraceFromGateway {
  agentId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  type: string;
  metaJson: string;
}

function isCompletionEvent(eventName: string): boolean {
  const normalized = eventName.toLowerCase();
  return COMPLETION_EVENT_PATTERNS.some(
    (pattern) => normalized.includes(pattern),
  );
}

export function mapGatewayEventToTrace(
  frame: GatewayEventFrame,
): TraceFromGateway | null {
  const eventName = frame.event.trim();
  if (!eventName || !isCompletionEvent(eventName)) {
    return null;
  }

  const payloadRecord = payloadToObject(frame.payload);
  if (!payloadRecord) {
    return null;
  }

  // usage 블록 추출 (usage.input_tokens 또는 최상위)
  const usageRecord =
    payloadToObject(payloadRecord.usage) ?? payloadRecord;

  const inputTokens =
    (typeof usageRecord.input_tokens === "number" && usageRecord.input_tokens) ||
    (typeof usageRecord.inputTokens === "number" && usageRecord.inputTokens) ||
    (typeof usageRecord.prompt_tokens === "number" && usageRecord.prompt_tokens) ||
    0;

  const outputTokens =
    (typeof usageRecord.output_tokens === "number" && usageRecord.output_tokens) ||
    (typeof usageRecord.outputTokens === "number" && usageRecord.outputTokens) ||
    (typeof usageRecord.completion_tokens === "number" && usageRecord.completion_tokens) ||
    0;

  if (inputTokens === 0 && outputTokens === 0) {
    return null; // 토큰 정보 없으면 스킵
  }

  const model =
    extractFirstString(payloadRecord, ["model", "modelId", "model_id"]) ??
    "unknown";

  const latencyMs =
    (typeof payloadRecord.latencyMs === "number" && payloadRecord.latencyMs) ||
    (typeof payloadRecord.latency_ms === "number" && payloadRecord.latency_ms) ||
    (typeof payloadRecord.durationMs === "number" && payloadRecord.durationMs) ||
    0;

  const agentId =
    detectAgentIdFromGatewayEvent(eventName, frame.payload) ?? "unknown";

  return {
    agentId,
    model,
    inputTokens,
    outputTokens,
    latencyMs,
    type: "llm_call",
    metaJson: safeStringify({
      event: eventName,
      seq: frame.seq ?? null,
    }),
  };
}

export function buildEventFingerprint(event: IngestEventInput): string {
  return crypto
    .createHash("sha1")
    .update(`${event.type}|${event.agentId ?? "-"}|${event.summary}`)
    .digest("hex");
}
