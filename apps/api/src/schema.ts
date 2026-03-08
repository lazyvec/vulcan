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
  skills: text("skills").notNull().default("[]"),
  configJson: text("config_json").notNull().default("{}"),
  isActive: integer("is_active").notNull().default(1),
  gatewayId: text("gateway_id"),
  capabilities: text("capabilities").notNull().default("[]"),
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

export const taskCommentsTable = sqliteTable(
  "task_comments",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id").notNull(),
    author: text("author").notNull().default("human"),
    content: text("content").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => ({
    idxTaskCommentsTask: index("idx_task_comments_task").on(table.taskId, table.createdAt),
  }),
);

export const taskDependenciesTable = sqliteTable(
  "task_dependencies",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id").notNull(),
    dependsOnTaskId: text("depends_on_task_id").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => ({
    idxTaskDepsTask: index("idx_task_deps_task").on(table.taskId),
    idxTaskDepsDepends: index("idx_task_deps_depends").on(table.dependsOnTaskId),
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

export const gatewaysTable = sqliteTable(
  "gateways",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    protocol: text("protocol").notNull().default("ws-rpc-v3"),
    status: text("status").notNull().default("unknown"),
    lastSeenAt: integer("last_seen_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => ({
    idxGatewaysUpdated: index("idx_gateways_updated").on(table.updatedAt),
  }),
);

export const agentCommandsTable = sqliteTable(
  "agent_commands",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id").notNull(),
    mode: text("mode").notNull(),
    command: text("command").notNull(),
    payloadJson: text("payload_json").notNull().default("{}"),
    status: text("status").notNull().default("queued"),
    gatewayCommandId: text("gateway_command_id"),
    error: text("error"),
    requestedBy: text("requested_by").notNull().default("human"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    executedAt: integer("executed_at"),
  },
  (table) => ({
    idxAgentCommandsAgent: index("idx_agent_commands_agent").on(table.agentId, table.createdAt),
    idxAgentCommandsStatus: index("idx_agent_commands_status").on(table.status, table.updatedAt),
  }),
);

export const skillsTable = sqliteTable("skills", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  displayName: text("display_name").notNull().default(""),
  description: text("description").notNull().default(""),
  category: text("category").notNull().default("other"),
  iconKey: text("icon_key").notNull().default("zap"),
  tags: text("tags").notNull().default("[]"),
  isBuiltin: integer("is_builtin").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const agentSkillsTable = sqliteTable(
  "agent_skills",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id").notNull(),
    skillId: text("skill_id").notNull(),
    skillName: text("skill_name").notNull(),
    installedAt: integer("installed_at").notNull(),
    syncedAt: integer("synced_at").notNull(),
  },
  (table) => ({
    idxAgentSkillsAgent: index("idx_agent_skills_agent").on(table.agentId),
    idxAgentSkillsSkill: index("idx_agent_skills_skill").on(table.skillId),
    idxAgentSkillsUniq: index("idx_agent_skills_uniq").on(table.agentId, table.skillName),
  }),
);

export const skillRegistryTable = sqliteTable("skill_registry", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  discoveredFrom: text("discovered_from").notNull(),
  firstSeenAt: integer("first_seen_at").notNull(),
  lastSeenAt: integer("last_seen_at").notNull(),
});

export const notificationPreferencesTable = sqliteTable("notification_preferences", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("default"),
  chatId: text("chat_id").notNull(),
  enabledCategories: text("enabled_categories").notNull().default("[]"),
  enabledTypes: text("enabled_types").notNull().default("[]"),
  silentHoursJson: text("silent_hours_json"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const notificationLogsTable = sqliteTable(
  "notification_logs",
  {
    id: text("id").primaryKey(),
    chatId: text("chat_id").notNull(),
    eventType: text("event_type").notNull(),
    message: text("message").notNull(),
    status: text("status").notNull(),
    error: text("error"),
    sentAt: integer("sent_at").notNull(),
  },
  (table) => ({
    idxNotificationLogsSentAt: index("idx_notification_logs_sent_at").on(table.sentAt),
  }),
);

export const auditLogTable = sqliteTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    ts: integer("ts").notNull(),
    actor: text("actor").notNull().default("human"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    source: text("source").notNull().default("api"),
    beforeJson: text("before_json").notNull().default("{}"),
    afterJson: text("after_json").notNull().default("{}"),
    metadataJson: text("metadata_json").notNull().default("{}"),
  },
  (table) => ({
    idxAuditLogTs: index("idx_audit_log_ts").on(table.ts),
    idxAuditLogEntity: index("idx_audit_log_entity").on(table.entityType, table.entityId, table.ts),
  }),
);
