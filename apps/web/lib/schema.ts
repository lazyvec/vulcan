import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const agentsTable = sqliteTable("agents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  roleTags: text("role_tags").notNull().default("[]"),
  mission: text("mission").notNull(),
  avatarKey: text("avatar_key").notNull().default("seed"),
  status: text("status").notNull(),
  statusSince: integer("status_since").notNull(),
  lastSeenAt: integer("last_seen_at").notNull(),
});

export const projectsTable = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    status: text("status").notNull(),
    progress: integer("progress").notNull().default(0),
    priority: text("priority").notNull(),
    ownerAgentId: text("owner_agent_id"),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => ({
    idxProjectsUpdated: index("idx_projects_updated").on(table.updatedAt),
  }),
);

export const tasksTable = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id"),
    title: text("title").notNull(),
    description: text("description"),
    assigneeAgentId: text("assignee_agent_id"),
    lane: text("lane").notNull(),
    priority: text("priority").notNull().default("medium"),
    dueAt: integer("due_at"),
    tags: text("tags").notNull().default("[]"),
    parentTaskId: text("parent_task_id"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => ({
    idxTasksLane: index("idx_tasks_lane").on(table.lane),
    idxTasksPriority: index("idx_tasks_priority").on(table.priority),
    idxTasksParent: index("idx_tasks_parent").on(table.parentTaskId),
  }),
);

export const eventsTable = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    ts: integer("ts").notNull(),
    source: text("source").notNull().default("openclaw"),
    agentId: text("agent_id"),
    projectId: text("project_id"),
    taskId: text("task_id"),
    type: text("type").notNull(),
    summary: text("summary").notNull(),
    payloadJson: text("payload_json").notNull().default("{}"),
  },
  (table) => ({
    idxEventsTs: index("idx_events_ts").on(table.ts),
  }),
);

export const memoryItemsTable = sqliteTable("memory_items", {
  id: text("id").primaryKey(),
  container: text("container").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  tags: text("tags").notNull().default("[]"),
  sourceRef: text("source_ref"),
  createdAt: integer("created_at").notNull(),
});

export const docsTable = sqliteTable("docs", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  tags: text("tags").notNull().default("[]"),
  format: text("format").notNull().default("markdown"),
  content: text("content").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const schedulesTable = sqliteTable("schedules", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  cronOrInterval: text("cron_or_interval").notNull(),
  status: text("status").notNull().default("scheduled"),
  lastRunAt: integer("last_run_at"),
  nextRunAt: integer("next_run_at"),
  ownerAgentId: text("owner_agent_id"),
});
