import { createHash } from "node:crypto";
import path from "node:path";
import Database from "better-sqlite3";
import { Client } from "pg";

type SqliteRow = Record<string, unknown>;

const dryRun = process.argv.includes("--dry-run");
const sqlitePath =
  process.env.VULCAN_DB_PATH ?? path.resolve(process.cwd(), "../web/data/vulcan.db");
const databaseUrl = process.env.DATABASE_URL ?? "";

if (!databaseUrl) {
  console.error("[migrate] DATABASE_URL is required");
  process.exit(1);
}

function parseArray(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map(String);
  }
  if (typeof raw !== "string" || !raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function parseObject(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw !== "string" || !raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function toDate(raw: unknown): Date | null {
  if (raw == null) {
    return null;
  }
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return new Date(numeric);
}

function stableUuid(scope: string, rawId: string): string {
  const hash = createHash("sha1").update(`${scope}:${rawId}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function mapId(
  map: Map<string, string>,
  scope: string,
  rawId: string | null | undefined,
  allowed?: Set<string>,
): string | null {
  if (!rawId) {
    return null;
  }
  if (allowed && !allowed.has(rawId)) {
    return null;
  }
  const found = map.get(rawId);
  if (found) {
    return found;
  }
  const created = stableUuid(scope, rawId);
  map.set(rawId, created);
  return created;
}

async function main() {
  const sqlite = new Database(sqlitePath, { readonly: true });

  const agents = sqlite.prepare("SELECT * FROM agents").all() as SqliteRow[];
  const projects = sqlite.prepare("SELECT * FROM projects").all() as SqliteRow[];
  const tasks = sqlite.prepare("SELECT * FROM tasks").all() as SqliteRow[];
  const events = sqlite.prepare("SELECT * FROM events").all() as SqliteRow[];
  const memoryItems = sqlite.prepare("SELECT * FROM memory_items").all() as SqliteRow[];
  const docs = sqlite.prepare("SELECT * FROM docs").all() as SqliteRow[];
  const schedules = sqlite.prepare("SELECT * FROM schedules").all() as SqliteRow[];

  const counts = {
    agents: agents.length,
    projects: projects.length,
    tasks: tasks.length,
    events: events.length,
    memoryItems: memoryItems.length,
    docs: docs.length,
    schedules: schedules.length,
  };

  if (dryRun) {
    console.log("[migrate] dry-run counts");
    console.log(JSON.stringify(counts, null, 2));
    return;
  }

  const agentIdMap = new Map<string, string>();
  const projectIdMap = new Map<string, string>();
  const taskIdMap = new Map<string, string>();
  const eventIdMap = new Map<string, string>();
  const memoryIdMap = new Map<string, string>();
  const docIdMap = new Map<string, string>();
  const scheduleIdMap = new Map<string, string>();

  const agentIds = new Set(agents.map((row) => String(row.id)));
  const projectIds = new Set(projects.map((row) => String(row.id)));
  const taskIds = new Set(tasks.map((row) => String(row.id)));

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS agents (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        role_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
        mission TEXT NOT NULL,
        avatar_key TEXT NOT NULL DEFAULT 'seed',
        status TEXT NOT NULL,
        status_since TIMESTAMP NOT NULL,
        last_seen_at TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        progress INTEGER NOT NULL DEFAULT 0,
        priority TEXT NOT NULL,
        owner_agent_id UUID,
        updated_at TIMESTAMP NOT NULL,
        CONSTRAINT fk_projects_owner FOREIGN KEY (owner_agent_id) REFERENCES agents(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY,
        project_id UUID,
        title TEXT NOT NULL,
        assignee_agent_id UUID,
        lane TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL,
        CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
        CONSTRAINT fk_tasks_assignee FOREIGN KEY (assignee_agent_id) REFERENCES agents(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY,
        ts TIMESTAMP NOT NULL,
        source TEXT NOT NULL DEFAULT 'openclaw',
        agent_id UUID,
        project_id UUID,
        task_id UUID,
        type TEXT NOT NULL,
        summary TEXT NOT NULL,
        payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        CONSTRAINT fk_events_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL,
        CONSTRAINT fk_events_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
        CONSTRAINT fk_events_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS memory_items (
        id UUID PRIMARY KEY,
        container TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags JSONB NOT NULL DEFAULT '[]'::jsonb,
        source_ref TEXT,
        created_at TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS docs (
        id UUID PRIMARY KEY,
        title TEXT NOT NULL,
        tags JSONB NOT NULL DEFAULT '[]'::jsonb,
        format TEXT NOT NULL DEFAULT 'markdown',
        content TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS schedules (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        cron_or_interval TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled',
        last_run_at TIMESTAMP,
        next_run_at TIMESTAMP,
        owner_agent_id UUID,
        CONSTRAINT fk_schedules_owner FOREIGN KEY (owner_agent_id) REFERENCES agents(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects (updated_at);
      CREATE INDEX IF NOT EXISTS idx_tasks_lane ON tasks (lane);
      CREATE INDEX IF NOT EXISTS idx_events_ts ON events (ts);
    `);

    for (const row of agents) {
      const id = mapId(agentIdMap, "agent", String(row.id));
      await client.query(
        `INSERT INTO agents (id, name, role_tags, mission, avatar_key, status, status_since, last_seen_at)
         VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [
          id,
          String(row.name),
          JSON.stringify(parseArray(row.role_tags)),
          String(row.mission),
          String(row.avatar_key ?? "seed"),
          String(row.status),
          toDate(row.status_since),
          toDate(row.last_seen_at),
        ],
      );
    }

    for (const row of projects) {
      const id = mapId(projectIdMap, "project", String(row.id));
      await client.query(
        `INSERT INTO projects (id, name, status, progress, priority, owner_agent_id, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [
          id,
          String(row.name),
          String(row.status),
          Number(row.progress ?? 0),
          String(row.priority),
          mapId(agentIdMap, "agent", row.owner_agent_id ? String(row.owner_agent_id) : null, agentIds),
          toDate(row.updated_at),
        ],
      );
    }

    for (const row of tasks) {
      const id = mapId(taskIdMap, "task", String(row.id));
      await client.query(
        `INSERT INTO tasks (id, project_id, title, assignee_agent_id, lane, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [
          id,
          mapId(projectIdMap, "project", row.project_id ? String(row.project_id) : null, projectIds),
          String(row.title),
          mapId(agentIdMap, "agent", row.assignee_agent_id ? String(row.assignee_agent_id) : null, agentIds),
          String(row.lane),
          toDate(row.created_at),
          toDate(row.updated_at),
        ],
      );
    }

    for (const row of events) {
      const rawEventId = row.id ? String(row.id) : `${String(row.type)}:${String(row.summary)}`;
      const id = mapId(eventIdMap, "event", rawEventId);
      await client.query(
        `INSERT INTO events (id, ts, source, agent_id, project_id, task_id, type, summary, payload_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
         ON CONFLICT (id) DO NOTHING`,
        [
          id,
          toDate(row.ts),
          String(row.source ?? "openclaw"),
          mapId(agentIdMap, "agent", row.agent_id ? String(row.agent_id) : null, agentIds),
          mapId(projectIdMap, "project", row.project_id ? String(row.project_id) : null, projectIds),
          mapId(taskIdMap, "task", row.task_id ? String(row.task_id) : null, taskIds),
          String(row.type),
          String(row.summary),
          JSON.stringify(parseObject(row.payload_json)),
        ],
      );
    }

    for (const row of memoryItems) {
      const id = mapId(memoryIdMap, "memory", String(row.id));
      await client.query(
        `INSERT INTO memory_items (id, container, title, content, tags, source_ref, created_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [
          id,
          String(row.container),
          String(row.title),
          String(row.content),
          JSON.stringify(parseArray(row.tags)),
          row.source_ref ? String(row.source_ref) : null,
          toDate(row.created_at),
        ],
      );
    }

    for (const row of docs) {
      const id = mapId(docIdMap, "doc", String(row.id));
      await client.query(
        `INSERT INTO docs (id, title, tags, format, content, created_at, updated_at)
         VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [
          id,
          String(row.title),
          JSON.stringify(parseArray(row.tags)),
          String(row.format),
          String(row.content),
          toDate(row.created_at),
          toDate(row.updated_at),
        ],
      );
    }

    for (const row of schedules) {
      const id = mapId(scheduleIdMap, "schedule", String(row.id));
      await client.query(
        `INSERT INTO schedules (id, name, cron_or_interval, status, last_run_at, next_run_at, owner_agent_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [
          id,
          String(row.name),
          String(row.cron_or_interval),
          String(row.status),
          toDate(row.last_run_at),
          toDate(row.next_run_at),
          mapId(agentIdMap, "agent", row.owner_agent_id ? String(row.owner_agent_id) : null, agentIds),
        ],
      );
    }

    await client.query("COMMIT");
    console.log("[migrate] sqlite -> postgres 완료");
    console.log(JSON.stringify(counts, null, 2));
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
    sqlite.close();
  }
}

main().catch((error) => {
  console.error("[migrate] failed", error);
  process.exit(1);
});
