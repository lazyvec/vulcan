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
  const candidates = [
    path.join(cwd, "drizzle"),
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
      last_seen_at INTEGER NOT NULL
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

    CREATE INDEX IF NOT EXISTS idx_events_ts ON events (ts DESC);
    CREATE INDEX IF NOT EXISTS idx_tasks_lane ON tasks (lane);
    CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects (updated_at DESC);
  `);
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
  } else {
    ensureLegacyBootstrap();
  }

  schemaReady = true;
}

export function getSqlite() {
  ensureSchema();
  return sqlite;
}
