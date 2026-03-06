import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

interface AdapterEvent {
  type: "message" | "tool_call" | "error" | "sync";
  summary: string;
  source: string;
  payloadJson: string;
  agentId?: string | null;
}

const API_URL =
  process.env.VULCAN_INGEST_URL ?? "http://127.0.0.1:3001/api/adapter/ingest";
const LOG_DIR = process.env.OPENCLAW_LOG_DIR ?? "/tmp/openclaw";
const POLL_MS = Number(process.env.ADAPTER_POLL_MS ?? "3000");
const HEARTBEAT_MS = Number(process.env.ADAPTER_HEARTBEAT_MS ?? "45000");
const MAX_EVENTS_PER_MIN = Number(process.env.ADAPTER_MAX_EVENTS_PER_MIN ?? "20");
const MAX_BATCH = Number(process.env.ADAPTER_MAX_BATCH ?? "5");
const DRY_RUN = process.env.ADAPTER_DRY_RUN === "1";

const cursorByFile = new Map<string, number>();
const recentEventHashes = new Map<string, number>();
const sentWindow: number[] = [];

let lastSentAt = 0;

function now() {
  return Date.now();
}

function pruneOldState() {
  const cutoff = now() - 60_000;
  while (sentWindow.length && sentWindow[0]! < cutoff) {
    sentWindow.shift();
  }

  for (const [hash, ts] of recentEventHashes.entries()) {
    if (ts < cutoff) {
      recentEventHashes.delete(hash);
    }
  }
}

function findLatestLogFile(): string | null {
  if (!fs.existsSync(LOG_DIR)) {
    return null;
  }

  const files = fs
    .readdirSync(LOG_DIR)
    .filter((file) => file.startsWith("openclaw-") && file.endsWith(".log"))
    .map((file) => path.join(LOG_DIR, file));

  if (!files.length) {
    return null;
  }

  files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return files[0] ?? null;
}

function classifyLine(line: string): AdapterEvent | null {
  const normalized = line.trim();
  if (!normalized) {
    return null;
  }

  const summary = normalized.slice(0, 190);
  const lower = normalized.toLowerCase();

  if (lower.includes("error") || lower.includes("failed") || lower.includes("exception")) {
    return {
      type: "error",
      summary,
      source: "openclaw-log",
      payloadJson: JSON.stringify({ line: normalized }),
      agentId: "hermes",
    };
  }

  if (
    lower.includes("tool") ||
    lower.includes("apply_patch") ||
    lower.includes("exec") ||
    lower.includes("bash")
  ) {
    return {
      type: "tool_call",
      summary,
      source: "openclaw-log",
      payloadJson: JSON.stringify({ line: normalized }),
      agentId: "atlas",
    };
  }

  if (lower.includes("message") || lower.includes("session") || lower.includes("reply")) {
    return {
      type: "message",
      summary,
      source: "openclaw-log",
      payloadJson: JSON.stringify({ line: normalized }),
      agentId: "vesta",
    };
  }

  if (lower.includes("sync") || lower.includes("health") || lower.includes("heartbeat")) {
    return {
      type: "sync",
      summary,
      source: "openclaw-log",
      payloadJson: JSON.stringify({ line: normalized }),
      agentId: "atlas",
    };
  }

  return null;
}

function dedupe(events: AdapterEvent[]) {
  const unique: AdapterEvent[] = [];

  for (const event of events) {
    const hash = crypto
      .createHash("sha1")
      .update(`${event.type}|${event.agentId ?? "-"}|${event.summary}`)
      .digest("hex");

    if (recentEventHashes.has(hash)) {
      continue;
    }

    recentEventHashes.set(hash, now());
    unique.push(event);
  }

  return unique;
}

function rateLimit(events: AdapterEvent[]) {
  pruneOldState();
  const available = Math.max(0, MAX_EVENTS_PER_MIN - sentWindow.length);
  if (available <= 0) {
    return { allowed: [] as AdapterEvent[], dropped: events.length };
  }

  const maxNow = Math.min(available, MAX_BATCH);
  return {
    allowed: events.slice(0, maxNow),
    dropped: Math.max(0, events.length - maxNow),
  };
}

async function sendEvents(events: AdapterEvent[]) {
  if (!events.length) {
    return;
  }

  if (DRY_RUN) {
    console.log(`[adapter][dry-run] would send ${events.length} event(s)`);
    console.log(JSON.stringify(events, null, 2));
    lastSentAt = now();
    return;
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

  lastSentAt = stamped;
  console.log(`[adapter] sent ${events.length} event(s)`);
}

async function runTick() {
  const file = findLatestLogFile();

  if (!file) {
    if (now() - lastSentAt > HEARTBEAT_MS) {
      await sendEvents([
        {
          type: "sync",
          summary: "heartbeat: openclaw log source not found, adapter alive",
          source: "adapter-heartbeat",
          payloadJson: JSON.stringify({ logDir: LOG_DIR }),
          agentId: "atlas",
        },
      ]);
    }
    return;
  }

  const full = fs.readFileSync(file, "utf8");
  const known = cursorByFile.get(file);
  const previousCursor = known ?? Math.max(0, full.length - 12_000);

  if (previousCursor > full.length) {
    cursorByFile.set(file, full.length);
    return;
  }

  const chunk = full.slice(previousCursor);
  cursorByFile.set(file, full.length);

  const candidates = chunk
    .split(/\r?\n/)
    .map(classifyLine)
    .filter((item): item is AdapterEvent => Boolean(item));

  const unique = dedupe(candidates);
  const { allowed, dropped } = rateLimit(unique);

  if (allowed.length) {
    await sendEvents(allowed);
  }

  if (dropped > 0 && now() - lastSentAt > 10_000) {
    await sendEvents([
      {
        type: "sync",
        summary: `adapter rate-limit dropped ${dropped} event(s)`,
        source: "adapter",
        payloadJson: JSON.stringify({ dropped, maxPerMin: MAX_EVENTS_PER_MIN }),
        agentId: "atlas",
      },
    ]);
  }

  if (!allowed.length && dropped === 0 && now() - lastSentAt > HEARTBEAT_MS) {
    await sendEvents([
      {
        type: "sync",
        summary: "heartbeat: adapter connected with no new classified lines",
        source: "adapter-heartbeat",
        payloadJson: JSON.stringify({ file: path.basename(file) }),
        agentId: "atlas",
      },
    ]);
  }
}

async function main() {
  console.log(`[adapter] starting -> ${API_URL}`);
  console.log(`[adapter] source dir -> ${LOG_DIR}`);
  console.log(`[adapter] mode -> ${DRY_RUN ? "dry-run" : "live"}`);
  console.log(`[adapter] limits -> maxPerMin=${MAX_EVENTS_PER_MIN}, batch=${MAX_BATCH}`);

  await runTick();

  setInterval(() => {
    runTick().catch((error) => {
      console.error("[adapter] tick failed", error);
    });
  }, POLL_MS);
}

main().catch((error) => {
  console.error("[adapter] fatal", error);
  process.exit(1);
});
