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

const nowTs = (columnName: string) =>
  timestamp(columnName, { withTimezone: false }).defaultNow().notNull();

export const agentsPgTable = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  roleTags: jsonb("role_tags").$type<string[]>().notNull().default([]),
  mission: text("mission").notNull(),
  avatarKey: text("avatar_key").notNull().default("seed"),
  status: text("status").notNull(),
  statusSince: timestamp("status_since", { withTimezone: false }).notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: false }).notNull(),
  skills: jsonb("skills").$type<string[]>().notNull().default([]),
  configJson: jsonb("config_json").$type<Record<string, unknown>>().notNull().default({}),
  isActive: integer("is_active").notNull().default(1),
  gatewayId: text("gateway_id"),
  capabilities: jsonb("capabilities").$type<string[]>().notNull().default([]),
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
    description: text("description"),
    assigneeAgentId: uuid("assignee_agent_id"),
    lane: text("lane").notNull(),
    priority: text("priority").notNull().default("medium"),
    dueAt: timestamp("due_at", { withTimezone: false }),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    parentTaskId: uuid("parent_task_id"),
    createdAt: timestamp("created_at", { withTimezone: false }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).notNull(),
  },
  (table) => ({
    idxTasksLane: index("idx_tasks_lane").on(table.lane),
    idxTasksPriority: index("idx_tasks_priority").on(table.priority),
    idxTasksParent: index("idx_tasks_parent").on(table.parentTaskId),
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
    fkTasksParent: foreignKey({
      name: "fk_tasks_parent",
      columns: [table.parentTaskId],
      foreignColumns: [table.id],
    }).onDelete("set null"),
  }),
);

export const taskCommentsPgTable = pgTable(
  "task_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id").notNull(),
    author: text("author").notNull().default("human"),
    content: text("content").notNull(),
    createdAt: nowTs("created_at"),
  },
  (table) => ({
    idxTaskCommentsTask: index("idx_task_comments_task").on(table.taskId, table.createdAt),
    fkTaskCommentsTask: foreignKey({
      name: "fk_task_comments_task",
      columns: [table.taskId],
      foreignColumns: [tasksPgTable.id],
    }).onDelete("cascade"),
  }),
);

export const taskDependenciesPgTable = pgTable(
  "task_dependencies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id").notNull(),
    dependsOnTaskId: uuid("depends_on_task_id").notNull(),
    createdAt: nowTs("created_at"),
  },
  (table) => ({
    idxTaskDepsTask: index("idx_task_deps_task").on(table.taskId),
    idxTaskDepsDepends: index("idx_task_deps_depends").on(table.dependsOnTaskId),
    fkTaskDepsTask: foreignKey({
      name: "fk_task_deps_task",
      columns: [table.taskId],
      foreignColumns: [tasksPgTable.id],
    }).onDelete("cascade"),
    fkTaskDepsDepends: foreignKey({
      name: "fk_task_deps_depends",
      columns: [table.dependsOnTaskId],
      foreignColumns: [tasksPgTable.id],
    }).onDelete("cascade"),
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
  createdAt: nowTs("created_at"),
  updatedAt: nowTs("updated_at"),
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

export const gatewaysPgTable = pgTable(
  "gateways",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    protocol: text("protocol").notNull().default("ws-rpc-v3"),
    status: text("status").notNull().default("unknown"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: false }),
    createdAt: nowTs("created_at"),
    updatedAt: nowTs("updated_at"),
  },
  (table) => ({
    idxGatewaysUpdated: index("idx_gateways_updated").on(table.updatedAt),
  }),
);

export const agentCommandsPgTable = pgTable(
  "agent_commands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id").notNull(),
    mode: text("mode").notNull(),
    command: text("command").notNull(),
    payloadJson: jsonb("payload_json").$type<Record<string, unknown>>().notNull().default({}),
    status: text("status").notNull().default("queued"),
    gatewayCommandId: text("gateway_command_id"),
    error: text("error"),
    requestedBy: text("requested_by").notNull().default("human"),
    createdAt: nowTs("created_at"),
    updatedAt: nowTs("updated_at"),
    executedAt: timestamp("executed_at", { withTimezone: false }),
  },
  (table) => ({
    idxAgentCommandsAgent: index("idx_agent_commands_agent").on(table.agentId, table.createdAt),
    idxAgentCommandsStatus: index("idx_agent_commands_status").on(table.status, table.updatedAt),
    fkAgentCommandsAgent: foreignKey({
      name: "fk_agent_commands_agent",
      columns: [table.agentId],
      foreignColumns: [agentsPgTable.id],
    }).onDelete("cascade"),
  }),
);

export const skillsPgTable = pgTable("skills", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  displayName: text("display_name").notNull().default(""),
  description: text("description").notNull().default(""),
  category: text("category").notNull().default("other"),
  iconKey: text("icon_key").notNull().default("zap"),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  isBuiltin: integer("is_builtin").notNull().default(0),
  createdAt: nowTs("created_at"),
  updatedAt: nowTs("updated_at"),
});

export const agentSkillsPgTable = pgTable(
  "agent_skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id").notNull(),
    skillId: uuid("skill_id").notNull(),
    skillName: text("skill_name").notNull(),
    installedAt: nowTs("installed_at"),
    syncedAt: nowTs("synced_at"),
  },
  (table) => ({
    idxAgentSkillsAgent: index("idx_agent_skills_agent_pg").on(table.agentId),
    idxAgentSkillsSkill: index("idx_agent_skills_skill_pg").on(table.skillId),
    idxAgentSkillsUniq: index("idx_agent_skills_uniq_pg").on(table.agentId, table.skillName),
    fkAgentSkillsAgent: foreignKey({
      name: "fk_agent_skills_agent",
      columns: [table.agentId],
      foreignColumns: [agentsPgTable.id],
    }).onDelete("cascade"),
    fkAgentSkillsSkill: foreignKey({
      name: "fk_agent_skills_skill",
      columns: [table.skillId],
      foreignColumns: [skillsPgTable.id],
    }).onDelete("cascade"),
  }),
);

export const skillRegistryPgTable = pgTable("skill_registry", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  discoveredFrom: text("discovered_from").notNull(),
  firstSeenAt: nowTs("first_seen_at"),
  lastSeenAt: nowTs("last_seen_at"),
});

export const notificationPreferencesPgTable = pgTable("notification_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().default("default"),
  chatId: text("chat_id").notNull(),
  enabledCategories: jsonb("enabled_categories").$type<string[]>().notNull().default([]),
  enabledTypes: jsonb("enabled_types").$type<string[]>().notNull().default([]),
  silentHoursJson: jsonb("silent_hours_json").$type<{ startHour: number; endHour: number } | null>(),
  createdAt: nowTs("created_at"),
  updatedAt: nowTs("updated_at"),
});

export const notificationLogsPgTable = pgTable(
  "notification_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatId: text("chat_id").notNull(),
    eventType: text("event_type").notNull(),
    message: text("message").notNull(),
    status: text("status").notNull(),
    error: text("error"),
    sentAt: nowTs("sent_at"),
  },
  (table) => ({
    idxNotificationLogsSentAt: index("idx_notification_logs_sent_at_pg").on(table.sentAt),
  }),
);

// ── Approval / Governance (Phase 8) ────────────────────────────────────────

export const approvalPoliciesPgTable = pgTable(
  "approval_policies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    matchAgentId: uuid("match_agent_id"),
    matchMode: text("match_mode"),
    matchCommandPattern: text("match_command_pattern"),
    autoApproveMinutes: integer("auto_approve_minutes"),
    isActive: integer("is_active").notNull().default(1),
    createdAt: nowTs("created_at"),
    updatedAt: nowTs("updated_at"),
  },
  (table) => ({
    idxApprovalPoliciesActive: index("idx_approval_policies_active").on(table.isActive),
  }),
);

export const approvalsPgTable = pgTable(
  "approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentCommandId: uuid("agent_command_id").notNull(),
    policyId: uuid("policy_id").notNull(),
    status: text("status").notNull().default("pending"),
    requestedBy: text("requested_by").notNull().default("human"),
    resolvedBy: text("resolved_by"),
    resolvedReason: text("resolved_reason"),
    expiresAt: timestamp("expires_at", { withTimezone: false }),
    createdAt: nowTs("created_at"),
    updatedAt: nowTs("updated_at"),
  },
  (table) => ({
    idxApprovalsCommandId: index("idx_approvals_command_id").on(table.agentCommandId),
    idxApprovalsStatus: index("idx_approvals_status").on(table.status),
    idxApprovalsExpires: index("idx_approvals_expires").on(table.expiresAt),
    fkApprovalsCommand: foreignKey({
      name: "fk_approvals_command",
      columns: [table.agentCommandId],
      foreignColumns: [agentCommandsPgTable.id],
    }).onDelete("cascade"),
    fkApprovalsPolicy: foreignKey({
      name: "fk_approvals_policy",
      columns: [table.policyId],
      foreignColumns: [approvalPoliciesPgTable.id],
    }).onDelete("cascade"),
  }),
);

export const auditLogPgTable = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ts: nowTs("ts"),
    actor: text("actor").notNull().default("human"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    source: text("source").notNull().default("api"),
    beforeJson: jsonb("before_json").$type<Record<string, unknown>>().notNull().default({}),
    afterJson: jsonb("after_json").$type<Record<string, unknown>>().notNull().default({}),
    metadataJson: jsonb("metadata_json").$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => ({
    idxAuditLogTs: index("idx_audit_log_ts").on(table.ts),
    idxAuditLogEntity: index("idx_audit_log_entity").on(table.entityType, table.entityId, table.ts),
  }),
);
