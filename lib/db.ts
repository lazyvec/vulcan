import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

const DB_PATH =
  process.env.VULCAN_DB_PATH ?? path.join(process.cwd(), "data", "vulcan.db");

const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

let schemaReady = false;

export function ensureSchema() {
  if (schemaReady) {
    return;
  }

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

  schemaReady = true;
}

export function getSqlite() {
  ensureSchema();
  return sqlite;
}
