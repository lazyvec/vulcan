import { setTimeout as sleep } from "node:timers/promises";
import type { IngestEventInput } from "@vulcan/shared/types";
import type { GatewayEventFrame } from "../src/gateway-rpc/types";
import { createGatewayRpcClientFromEnv } from "../src/gateway-rpc/client";
import {
  buildEventFingerprint,
  mapGatewayEventToIngest,
} from "../src/gateway-rpc/event-adapter";

const API_URL =
  process.env.VULCAN_INGEST_URL ?? "http://127.0.0.1:8787/api/adapter/ingest";
const FLUSH_MS = Number(process.env.ADAPTER_POLL_MS ?? "1500");
const HEARTBEAT_MS = Number(process.env.ADAPTER_HEARTBEAT_MS ?? "45000");
const MAX_EVENTS_PER_MIN = Number(process.env.ADAPTER_MAX_EVENTS_PER_MIN ?? "40");
const MAX_BATCH = Number(process.env.ADAPTER_MAX_BATCH ?? "12");
const DRY_RUN = process.env.ADAPTER_DRY_RUN === "1";

const queue: IngestEventInput[] = [];
const recentEventHashes = new Map<string, number>();
const sentWindow: number[] = [];

let shuttingDown = false;
let lastHeartbeatAt = 0;
let lastGatewayConnected: boolean | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;

function now() {
  return Date.now();
}

function pruneWindow() {
  const cutoff = now() - 60_000;
  while (sentWindow.length && sentWindow[0] < cutoff) {
    sentWindow.shift();
  }
  for (const [hash, ts] of recentEventHashes.entries()) {
    if (ts < cutoff) {
      recentEventHashes.delete(hash);
    }
  }
}

function enqueueEvent(event: IngestEventInput) {
  const hash = buildEventFingerprint(event);
  const ts = now();
  const seenAt = recentEventHashes.get(hash);
  if (typeof seenAt === "number" && ts - seenAt < 60_000) {
    return;
  }
  recentEventHashes.set(hash, ts);
  queue.push(event);
}

function applyRateLimit(events: IngestEventInput[]) {
  pruneWindow();
  const available = Math.max(0, MAX_EVENTS_PER_MIN - sentWindow.length);
  if (available <= 0) {
    return { allowed: [] as IngestEventInput[], dropped: events.length };
  }
  const allowedCount = Math.min(available, MAX_BATCH, events.length);
  return {
    allowed: events.slice(0, allowedCount),
    dropped: events.length - allowedCount,
  };
}

async function sendEvents(events: IngestEventInput[]): Promise<boolean> {
  if (!events.length) {
    return true;
  }
  if (DRY_RUN) {
    console.log(`[adapter-gateway][dry-run] would send ${events.length} event(s)`);
    return true;
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ingest failed: ${response.status} ${text}`);
  }

  const stamped = now();
  for (let i = 0; i < events.length; i += 1) {
    sentWindow.push(stamped);
  }
  return true;
}

function onGatewayEvent(frame: GatewayEventFrame) {
  const mapped = mapGatewayEventToIngest(frame);
  if (!mapped) {
    return;
  }
  enqueueEvent(mapped);
}

async function flushQueue() {
  if (!queue.length) {
    return;
  }

  const snapshot = queue.splice(0, queue.length);
  const { allowed, dropped } = applyRateLimit(snapshot);

  if (dropped > 0) {
    enqueueEvent({
      source: "adapter-gateway",
      type: "sync",
      summary: `gateway adapter rate-limit dropped ${dropped} event(s)`,
      agentId: "atlas",
      payloadJson: JSON.stringify({
        dropped,
        maxPerMin: MAX_EVENTS_PER_MIN,
        batch: MAX_BATCH,
      }),
    });
  }

  if (!allowed.length) {
    return;
  }

  await sendEvents(allowed);
  console.log(`[adapter-gateway] sent ${allowed.length} event(s)`);
}

function maybeEmitGatewayState(status: { connected: boolean; lastError: string | null }) {
  if (lastGatewayConnected === status.connected) {
    return;
  }
  lastGatewayConnected = status.connected;

  const summary = status.connected
    ? "gateway adapter attached: websocket connected"
    : "gateway adapter detached: websocket disconnected";

  enqueueEvent({
    source: "adapter-gateway",
    type: "sync",
    summary,
    agentId: "atlas",
    payloadJson: JSON.stringify({
      connected: status.connected,
      lastError: status.lastError,
    }),
  });
}

function maybeEmitHeartbeat(status: {
  connected: boolean;
  pendingRequests: number;
  reconnectInMs: number | null;
  lastError: string | null;
}) {
  if (now() - lastHeartbeatAt < HEARTBEAT_MS) {
    return;
  }
  lastHeartbeatAt = now();
  enqueueEvent({
    source: "adapter-gateway-heartbeat",
    type: "sync",
    summary: status.connected
      ? "heartbeat: gateway adapter connected"
      : "heartbeat: gateway adapter reconnecting",
    agentId: "atlas",
    payloadJson: JSON.stringify(status),
  });
}

async function main() {
  const gatewayClient = createGatewayRpcClientFromEnv({
    onEvent: onGatewayEvent,
  });

  console.log(`[adapter-gateway] starting -> ${API_URL}`);
  console.log(
    `[adapter-gateway] poll=${FLUSH_MS}ms, maxPerMin=${MAX_EVENTS_PER_MIN}, batch=${MAX_BATCH}`,
  );
  console.log(`[adapter-gateway] mode -> ${DRY_RUN ? "dry-run" : "live"}`);

  gatewayClient.start();

  flushTimer = setInterval(() => {
    const status = gatewayClient.getStatus();
    maybeEmitGatewayState(status);
    maybeEmitHeartbeat(status);
    void flushQueue().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[adapter-gateway] flush failed: ${message}`);
    });
  }, FLUSH_MS);

  const shutdown = async (signal: string) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    console.log(`[adapter-gateway] shutting down (${signal})`);
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
    gatewayClient.stop();
    await sleep(150);
    try {
      await flushQueue();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[adapter-gateway] final flush failed: ${message}`);
    }
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[adapter-gateway] fatal: ${message}`);
  process.exit(1);
});
