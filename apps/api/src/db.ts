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
    CREATE TABLE IF NOT EXISTS task_comments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT 'human',
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS task_dependencies (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      depends_on_task_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_log_ts ON audit_log (ts DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log (entity_type, entity_id, ts DESC);
    CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments (task_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_task_deps_task ON task_dependencies (task_id);
    CREATE INDEX IF NOT EXISTS idx_task_deps_depends ON task_dependencies (depends_on_task_id);

    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'other',
      icon_key TEXT NOT NULL DEFAULT 'zap',
      tags TEXT NOT NULL DEFAULT '[]',
      is_builtin INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_skills (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      skill_name TEXT NOT NULL,
      installed_at INTEGER NOT NULL,
      synced_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS skill_registry (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      discovered_from TEXT NOT NULL,
      first_seen_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_skills_name ON skills (name);
    CREATE INDEX IF NOT EXISTS idx_agent_skills_agent ON agent_skills (agent_id);
    CREATE INDEX IF NOT EXISTS idx_agent_skills_skill ON agent_skills (skill_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_skills_uniq ON agent_skills (agent_id, skill_name);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_registry_name ON skill_registry (name);

    CREATE INDEX IF NOT EXISTS idx_events_type ON events (type, ts DESC);
    CREATE INDEX IF NOT EXISTS idx_events_agent ON events (agent_id, ts DESC);
    CREATE INDEX IF NOT EXISTS idx_events_source ON events (source, ts DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log (action, ts DESC);

    CREATE TABLE IF NOT EXISTS notification_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default',
      chat_id TEXT NOT NULL,
      enabled_categories TEXT NOT NULL DEFAULT '[]',
      enabled_types TEXT NOT NULL DEFAULT '[]',
      silent_hours_json TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notification_logs (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL,
      error TEXT,
      sent_at INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences (user_id);
    CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs (sent_at DESC);

    CREATE TABLE IF NOT EXISTS approval_policies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      match_agent_id TEXT,
      match_mode TEXT,
      match_command_pattern TEXT,
      auto_approve_minutes INTEGER,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      agent_command_id TEXT NOT NULL,
      policy_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      requested_by TEXT NOT NULL DEFAULT 'human',
      resolved_by TEXT,
      resolved_reason TEXT,
      expires_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_approval_policies_active ON approval_policies (is_active);
    CREATE INDEX IF NOT EXISTS idx_approvals_command_id ON approvals (agent_command_id);
    CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals (status);
    CREATE INDEX IF NOT EXISTS idx_approvals_expires ON approvals (expires_at);

    CREATE TABLE IF NOT EXISTS work_orders (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      summary TEXT NOT NULL,
      from_agent_id TEXT NOT NULL,
      to_agent_id TEXT NOT NULL,
      project TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'pending',
      acceptance_criteria TEXT NOT NULL DEFAULT '[]',
      inputs_json TEXT NOT NULL DEFAULT '{}',
      timeout_seconds INTEGER NOT NULL DEFAULT 600,
      parent_work_order_id TEXT,
      linked_task_id TEXT,
      linked_command_id TEXT,
      checkpoint_json TEXT,
      verifier_agent_id TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0,
      deadline INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      completed_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders (status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_work_orders_to ON work_orders (to_agent_id, status);
    CREATE INDEX IF NOT EXISTS idx_work_orders_from ON work_orders (from_agent_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_work_orders_project ON work_orders (project);
    CREATE INDEX IF NOT EXISTS idx_work_orders_parent ON work_orders (parent_work_order_id);

    CREATE TABLE IF NOT EXISTS work_results (
      id TEXT PRIMARY KEY,
      work_order_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      status TEXT NOT NULL,
      summary TEXT NOT NULL,
      error_detail TEXT,
      changes_json TEXT NOT NULL DEFAULT '[]',
      evidence_json TEXT NOT NULL DEFAULT '{}',
      metrics_json TEXT NOT NULL DEFAULT '{}',
      follow_up TEXT NOT NULL DEFAULT '[]',
      started_at INTEGER,
      completed_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_work_results_order ON work_results (work_order_id);
    CREATE INDEX IF NOT EXISTS idx_work_results_agent ON work_results (agent_id, completed_at);

    CREATE TABLE IF NOT EXISTS traces (
      id TEXT PRIMARY KEY,
      trace_id TEXT NOT NULL,
      ts INTEGER NOT NULL,
      agent_id TEXT NOT NULL,
      type TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      cost REAL NOT NULL DEFAULT 0,
      latency_ms INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'ok',
      meta_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE INDEX IF NOT EXISTS idx_traces_ts ON traces (ts DESC);
    CREATE INDEX IF NOT EXISTS idx_traces_agent_ts ON traces (agent_id, ts DESC);
    CREATE INDEX IF NOT EXISTS idx_traces_trace_id ON traces (trace_id);
    CREATE INDEX IF NOT EXISTS idx_traces_type_ts ON traces (type, ts DESC);

    CREATE TABLE IF NOT EXISTS circuit_breaker_config (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      daily_token_limit INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_at INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_cb_config_agent ON circuit_breaker_config (agent_id);

    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      file_path TEXT NOT NULL,
      memory_type TEXT NOT NULL DEFAULT 'fact',
      layer TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      agent_id TEXT,
      project_id TEXT,
      lifecycle TEXT NOT NULL DEFAULT 'active',
      utility_score REAL NOT NULL DEFAULT 1.0,
      access_count INTEGER NOT NULL DEFAULT 0,
      evergreen INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_accessed_at INTEGER,
      expires_at INTEGER,
      file_size INTEGER NOT NULL DEFAULT 0,
      file_modified_at INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_memories_file_path ON memories (file_path);
    CREATE INDEX IF NOT EXISTS idx_memories_layer ON memories (layer);
    CREATE INDEX IF NOT EXISTS idx_memories_type ON memories (memory_type);
    CREATE INDEX IF NOT EXISTS idx_memories_lifecycle ON memories (lifecycle);
    CREATE INDEX IF NOT EXISTS idx_memories_score ON memories (utility_score);
  `);

  ensureColumn("approvals", "telegram_message_id", "telegram_message_id INTEGER");

  ensureColumn("tasks", "description", "description TEXT");
  ensureColumn("tasks", "priority", "priority TEXT NOT NULL DEFAULT 'medium'");
  ensureColumn("tasks", "due_at", "due_at INTEGER");
  ensureColumn("tasks", "tags", "tags TEXT NOT NULL DEFAULT '[]'");
  ensureColumn("tasks", "parent_task_id", "parent_task_id TEXT");

  ensureColumn("agents", "skills", "skills TEXT NOT NULL DEFAULT '[]'");
  ensureColumn("agents", "config_json", "config_json TEXT NOT NULL DEFAULT '{}'");
  ensureColumn("agents", "is_active", "is_active INTEGER NOT NULL DEFAULT 1");
  ensureColumn("agents", "gateway_id", "gateway_id TEXT");
  ensureColumn("agents", "capabilities", "capabilities TEXT NOT NULL DEFAULT '[]'");

  ensureColumn("memory_items", "updated_at", "updated_at INTEGER");
  ensureColumn("memory_items", "importance", "importance REAL");
  ensureColumn("memory_items", "expires_at", "expires_at INTEGER");
  ensureColumn("memory_items", "memory_type", "memory_type TEXT");

  // ensureColumn으로 추가된 컬럼에 의존하는 인덱스는 여기서 생성
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks (priority);
    CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks (parent_task_id);
  `);

  // ── FTS5 가상 테이블 + 동기화 트리거 (Hermes Memory) ────────────────────
  sqlite.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
      title,
      content,
      tags,
      content='memories',
      content_rowid='rowid',
      tokenize='unicode61 remove_diacritics 2'
    );

    CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
      INSERT INTO memories_fts(rowid, title, content, tags)
      VALUES (NEW.rowid, NEW.title, NEW.content, NEW.tags);
    END;

    CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
      INSERT INTO memories_fts(memories_fts, rowid, title, content, tags)
      VALUES ('delete', OLD.rowid, OLD.title, OLD.content, OLD.tags);
    END;

    CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
      INSERT INTO memories_fts(memories_fts, rowid, title, content, tags)
      VALUES ('delete', OLD.rowid, OLD.title, OLD.content, OLD.tags);
      INSERT INTO memories_fts(rowid, title, content, tags)
      VALUES (NEW.rowid, NEW.title, NEW.content, NEW.tags);
    END;
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
