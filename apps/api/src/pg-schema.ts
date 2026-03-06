import {
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const nowTs = () => timestamp({ withTimezone: false }).defaultNow().notNull();

export const agentsPgTable = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  roleTags: jsonb("role_tags").$type<string[]>().notNull().default([]),
  mission: text("mission").notNull(),
  avatarKey: text("avatar_key").notNull().default("seed"),
  status: text("status").notNull(),
  statusSince: timestamp("status_since", { withTimezone: false }).notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: false }).notNull(),
});

export const projectsPgTable = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    status: text("status").notNull(),
    progress: integer("progress").notNull().default(0),
    priority: text("priority").notNull(),
    ownerAgentId: uuid("owner_agent_id"),
    updatedAt: timestamp("updated_at", { withTimezone: false }).notNull(),
  },
  (table) => ({
    idxProjectsUpdated: index("idx_projects_updated").on(table.updatedAt),
    fkProjectsOwner: foreignKey({
      name: "fk_projects_owner",
      columns: [table.ownerAgentId],
      foreignColumns: [agentsPgTable.id],
    }).onDelete("set null"),
  }),
);

export const tasksPgTable = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id"),
    title: text("title").notNull(),
    assigneeAgentId: uuid("assignee_agent_id"),
    lane: text("lane").notNull(),
    createdAt: timestamp("created_at", { withTimezone: false }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).notNull(),
  },
  (table) => ({
    idxTasksLane: index("idx_tasks_lane").on(table.lane),
    fkTasksProject: foreignKey({
      name: "fk_tasks_project",
      columns: [table.projectId],
      foreignColumns: [projectsPgTable.id],
    }).onDelete("set null"),
    fkTasksAssignee: foreignKey({
      name: "fk_tasks_assignee",
      columns: [table.assigneeAgentId],
      foreignColumns: [agentsPgTable.id],
    }).onDelete("set null"),
  }),
);

export const eventsPgTable = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ts: timestamp("ts", { withTimezone: false }).notNull(),
    source: text("source").notNull().default("openclaw"),
    agentId: uuid("agent_id"),
    projectId: uuid("project_id"),
    taskId: uuid("task_id"),
    type: text("type").notNull(),
    summary: text("summary").notNull(),
    payloadJson: jsonb("payload_json").$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => ({
    idxEventsTs: index("idx_events_ts").on(table.ts),
    fkEventsAgent: foreignKey({
      name: "fk_events_agent",
      columns: [table.agentId],
      foreignColumns: [agentsPgTable.id],
    }).onDelete("set null"),
    fkEventsProject: foreignKey({
      name: "fk_events_project",
      columns: [table.projectId],
      foreignColumns: [projectsPgTable.id],
    }).onDelete("set null"),
    fkEventsTask: foreignKey({
      name: "fk_events_task",
      columns: [table.taskId],
      foreignColumns: [tasksPgTable.id],
    }).onDelete("set null"),
  }),
);

export const memoryItemsPgTable = pgTable("memory_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  container: text("container").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  sourceRef: text("source_ref"),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull(),
});

export const docsPgTable = pgTable("docs", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  format: text("format").notNull().default("markdown"),
  content: text("content").notNull(),
  createdAt: nowTs(),
  updatedAt: nowTs(),
});

export const schedulesPgTable = pgTable(
  "schedules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    cronOrInterval: text("cron_or_interval").notNull(),
    status: text("status").notNull().default("scheduled"),
    lastRunAt: timestamp("last_run_at", { withTimezone: false }),
    nextRunAt: timestamp("next_run_at", { withTimezone: false }),
    ownerAgentId: uuid("owner_agent_id"),
  },
  (table) => ({
    fkSchedulesOwner: foreignKey({
      name: "fk_schedules_owner",
      columns: [table.ownerAgentId],
      foreignColumns: [agentsPgTable.id],
    }).onDelete("set null"),
  }),
);
