import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

function pickExistingPath(candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function resolveDbPath() {
  if (process.env.VULCAN_DB_PATH) {
    return process.env.VULCAN_DB_PATH;
  }

  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "data", "vulcan.db"),
    path.join(cwd, "apps", "web", "data", "vulcan.db"),
    path.resolve(cwd, "../web/data/vulcan.db"),
  ];

  return pickExistingPath(candidates) ?? candidates[0];
}

function resolveMigrationsPath() {
  if (process.env.VULCAN_DRIZZLE_PATH) {
    return process.env.VULCAN_DRIZZLE_PATH;
  }

  const cwd = process.cwd();
  // Keep SQLite runtime migrations separate from PostgreSQL drizzle artifacts.
  const candidates = [
    path.join(cwd, "drizzle-sqlite"),
    path.join(cwd, "apps", "web", "drizzle"),
    path.resolve(cwd, "../web/drizzle"),
  ];

  return pickExistingPath(candidates) ?? candidates[0];
}

const DB_PATH = resolveDbPath();
const MIGRATIONS_PATH = resolveMigrationsPath();

const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

let schemaReady = false;

function tableHasColumn(tableName: string, columnName: string) {
  const rows = sqlite
    .prepare(`PRAGMA table_info(${tableName})`)
    .all() as Array<{ name?: string }>;
  return rows.some((row) => row.name === columnName);
}

function ensureColumn(tableName: string, columnName: string, columnDefinition: string) {
  if (tableHasColumn(tableName, columnName)) {
    return;
  }
  sqlite.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition};`);
}

function ensureLegacyBootstrap() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role_tags TEXT NOT NULL DEFAULT '[]',
      mission TEXT NOT NULL,
      avatar_key TEXT NOT NULL DEFAULT 'seed',
      status TEXT NOT NULL,
      status_since INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      skills TEXT NOT NULL DEFAULT '[]',
      config_json TEXT NOT NULL DEFAULT '{}',
      is_active INTEGER NOT NULL DEFAULT 1,
      gateway_id TEXT,
      capabilities TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      priority TEXT NOT NULL,
      owner_agent_id TEXT,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      title TEXT NOT NULL,
      assignee_agent_id TEXT,
      lane TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      ts INTEGER NOT NULL,
      source TEXT NOT NULL DEFAULT 'openclaw',
      agent_id TEXT,
      project_id TEXT,
      task_id TEXT,
      type TEXT NOT NULL,
      summary TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS memory_items (
      id TEXT PRIMARY KEY,
      container TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      source_ref TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS docs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      format TEXT NOT NULL DEFAULT 'markdown',
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cron_or_interval TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled',
      last_run_at INTEGER,
      next_run_at INTEGER,
      owner_agent_id TEXT
    );

    CREATE TABLE IF NOT EXISTS gateways (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      protocol TEXT NOT NULL DEFAULT 'ws-rpc-v3',
      status TEXT NOT NULL DEFAULT 'unknown',
      last_seen_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_commands (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      mode TEXT NOT NULL,
      command TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'queued',
      gateway_command_id TEXT,
      error TEXT,
      requested_by TEXT NOT NULL DEFAULT 'human',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      executed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      ts INTEGER NOT NULL,
      actor TEXT NOT NULL DEFAULT 'human',
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      source TEXT NOT NULL DEFAULT 'api',
      before_json TEXT NOT NULL DEFAULT '{}',
      after_json TEXT NOT NULL DEFAULT '{}',
      metadata_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE INDEX IF NOT EXISTS idx_events_ts ON events (ts DESC);
    CREATE INDEX IF NOT EXISTS idx_tasks_lane ON tasks (lane);
    CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects (updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_gateways_updated ON gateways (updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_agent_commands_agent ON agent_commands (agent_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_agent_commands_status ON agent_commands (status, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_log_ts ON audit_log (ts DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log (entity_type, entity_id, ts DESC);
  `);

  ensureColumn("agents", "skills", "skills TEXT NOT NULL DEFAULT '[]'");
  ensureColumn("agents", "config_json", "config_json TEXT NOT NULL DEFAULT '{}'");
  ensureColumn("agents", "is_active", "is_active INTEGER NOT NULL DEFAULT 1");
  ensureColumn("agents", "gateway_id", "gateway_id TEXT");
  ensureColumn("agents", "capabilities", "capabilities TEXT NOT NULL DEFAULT '[]'");
}

export function ensureSchema() {
  if (schemaReady) {
    return;
  }

  const hasMigrationJournal = fs.existsSync(
    path.join(MIGRATIONS_PATH, "meta", "_journal.json"),
  );

  if (hasMigrationJournal) {
    migrate(db, { migrationsFolder: MIGRATIONS_PATH });
  }

  // Keep legacy SQLite databases forward-compatible even when
  // migrations exist but don't yet include newer Phase tables/columns.
  ensureLegacyBootstrap();

  schemaReady = true;
}

export function getSqlite() {
  ensureSchema();
  return sqlite;
}
