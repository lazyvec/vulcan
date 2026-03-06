import { Client } from "pg";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { streamSSE } from "hono/streaming";
import {
  createEventSchema,
  ingestPayloadSchema,
  taskLanePatchSchema,
} from "@vulcan/shared/schemas";
import {
  appendEvent,
  countRecords,
  getAgents,
  getDocs,
  getEventsSince,
  getLatestEvents,
  getMemoryItems,
  getProjects,
  getSchedules,
  getTasks,
  updateTaskLane,
} from "./store";
import { ensureSchema, getSqlite } from "./db";
import {
  getSubscriberCount,
  publishEvent,
  subscribeEvents,
} from "./event-stream";
import { getRuntimeInfo } from "./runtime-info";
import { getCommandQueue } from "./queue";

const app = new Hono();

app.use("*", logger());
app.use(
  "/api/*",
  cors({
    origin: process.env.VULCAN_CORS_ORIGIN ?? "*",
    allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use("*", async (c, next) => {
  await next();
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

app.get("/api/agents", (c) => c.json({ agents: getAgents() }));

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
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      400,
    );
  }

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
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
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
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
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
  const queue = getCommandQueue();
  if (!queue) {
    return { ok: null, status: "not_configured" };
  }

  try {
    const client = await queue.client;
    const ping = await client.ping();
    const ok = ping === "PONG";
    return {
      ok,
      status: ok ? "connected" : "error",
      queue: queue.name,
    };
  } catch (error) {
    return {
      ok: false,
      status: "error",
      error: error instanceof Error ? error.message : String(error),
      queue: queue.name,
    };
  }
}

app.get("/api/health", async (c) => {
  const runtime = getRuntimeInfo();

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
    sseOk: true,
    sseSubscribers: getSubscriberCount(),
    records: countRecords(),
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    port: process.env.VULCAN_API_PORT ?? "8787",
  };

  const status = payload.ok ? 200 : 503;
  return c.json(payload, status);
});

app.get("/", (c) => c.json({ service: "vulcan-api", ok: true }));

const port = Number(process.env.VULCAN_API_PORT ?? "8787");

serve(
  {
    fetch: app.fetch,
    port,
    hostname: "127.0.0.1",
  },
  (info) => {
    console.log(`[vulcan-api] listening on http://${info.address}:${info.port}`);
  },
);
