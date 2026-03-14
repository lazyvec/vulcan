import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
  updatedAt: integer("updated_at"),
  importance: real("importance"),
  expiresAt: integer("expires_at"),
  memoryType: text("memory_type"),
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

// ── Approval / Governance (Phase 8) ────────────────────────────────────────

export const approvalPoliciesTable = sqliteTable(
  "approval_policies",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    matchAgentId: text("match_agent_id"),
    matchMode: text("match_mode"),
    matchCommandPattern: text("match_command_pattern"),
    autoApproveMinutes: integer("auto_approve_minutes"),
    isActive: integer("is_active").notNull().default(1),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => ({
    idxApprovalPoliciesActive: index("idx_approval_policies_active").on(table.isActive),
  }),
);

export const approvalsTable = sqliteTable(
  "approvals",
  {
    id: text("id").primaryKey(),
    agentCommandId: text("agent_command_id").notNull(),
    policyId: text("policy_id").notNull(),
    status: text("status").notNull().default("pending"),
    requestedBy: text("requested_by").notNull().default("human"),
    resolvedBy: text("resolved_by"),
    resolvedReason: text("resolved_reason"),
    expiresAt: integer("expires_at"),
    telegramMessageId: integer("telegram_message_id"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => ({
    idxApprovalsCommandId: index("idx_approvals_command_id").on(table.agentCommandId),
    idxApprovalsStatus: index("idx_approvals_status").on(table.status),
    idxApprovalsExpires: index("idx_approvals_expires").on(table.expiresAt),
  }),
);

// ── WorkOrder / WorkResult (Phase 3) ────────────────────────────────────────

export const workOrdersTable = sqliteTable(
  "work_orders",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    summary: text("summary").notNull(),
    fromAgentId: text("from_agent_id").notNull(),
    toAgentId: text("to_agent_id").notNull(),
    project: text("project"),
    priority: text("priority").notNull().default("medium"),
    status: text("status").notNull().default("pending"),
    acceptanceCriteria: text("acceptance_criteria").notNull().default("[]"),
    inputsJson: text("inputs_json").notNull().default("{}"),
    timeoutSeconds: integer("timeout_seconds").notNull().default(600),
    parentWorkOrderId: text("parent_work_order_id"),
    linkedTaskId: text("linked_task_id"),
    linkedCommandId: text("linked_command_id"),
    checkpointJson: text("checkpoint_json"),
    verifierAgentId: text("verifier_agent_id"),
    retryCount: integer("retry_count").notNull().default(0),
    deadline: integer("deadline"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    completedAt: integer("completed_at"),
  },
  (table) => ({
    idxWorkOrdersStatus: index("idx_work_orders_status").on(table.status, table.updatedAt),
    idxWorkOrdersTo: index("idx_work_orders_to").on(table.toAgentId, table.status),
    idxWorkOrdersFrom: index("idx_work_orders_from").on(table.fromAgentId, table.createdAt),
    idxWorkOrdersProject: index("idx_work_orders_project").on(table.project),
    idxWorkOrdersParent: index("idx_work_orders_parent").on(table.parentWorkOrderId),
  }),
);

export const workResultsTable = sqliteTable(
  "work_results",
  {
    id: text("id").primaryKey(),
    workOrderId: text("work_order_id").notNull(),
    agentId: text("agent_id").notNull(),
    status: text("status").notNull(),
    summary: text("summary").notNull(),
    errorDetail: text("error_detail"),
    changesJson: text("changes_json").notNull().default("[]"),
    evidenceJson: text("evidence_json").notNull().default("{}"),
    metricsJson: text("metrics_json").notNull().default("{}"),
    followUp: text("follow_up").notNull().default("[]"),
    startedAt: integer("started_at"),
    completedAt: integer("completed_at").notNull(),
  },
  (table) => ({
    idxWorkResultsOrder: index("idx_work_results_order").on(table.workOrderId),
    idxWorkResultsAgent: index("idx_work_results_agent").on(table.agentId, table.completedAt),
  }),
);

// ── Trace / FinOps (Phase 11) ────────────────────────────────────────────────

export const tracesTable = sqliteTable(
  "traces",
  {
    id: text("id").primaryKey(),
    traceId: text("trace_id").notNull(),
    ts: integer("ts").notNull(),
    agentId: text("agent_id").notNull(),
    type: text("type").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    cost: real("cost").notNull().default(0),
    latencyMs: integer("latency_ms").notNull().default(0),
    status: text("status").notNull().default("ok"),
    metaJson: text("meta_json").notNull().default("{}"),
  },
  (table) => ({
    idxTracesTs: index("idx_traces_ts").on(table.ts),
    idxTracesAgentTs: index("idx_traces_agent_ts").on(table.agentId, table.ts),
    idxTracesTraceId: index("idx_traces_trace_id").on(table.traceId),
    idxTracesTypeTs: index("idx_traces_type_ts").on(table.type, table.ts),
  }),
);

export const circuitBreakerConfigTable = sqliteTable(
  "circuit_breaker_config",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id").notNull(),
    dailyTokenLimit: integer("daily_token_limit").notNull(),
    isActive: integer("is_active").notNull().default(1),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => ({
    idxCbConfigAgent: uniqueIndex("idx_cb_config_agent").on(table.agentId),
  }),
);

// ── Hermes Memory (Phase 5) ────────────────────────────────────────────────

export const memoriesTable = sqliteTable(
  "memories",
  {
    id: text("id").primaryKey(),
    filePath: text("file_path").notNull(),
    memoryType: text("memory_type").notNull().default("fact"),
    layer: text("layer").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    contentHash: text("content_hash").notNull(),
    tags: text("tags").notNull().default("[]"),
    agentId: text("agent_id"),
    projectId: text("project_id"),
    lifecycle: text("lifecycle").notNull().default("active"),
    utilityScore: real("utility_score").notNull().default(1.0),
    accessCount: integer("access_count").notNull().default(0),
    evergreen: integer("evergreen").notNull().default(0),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    lastAccessedAt: integer("last_accessed_at"),
    expiresAt: integer("expires_at"),
    fileSize: integer("file_size").notNull().default(0),
    fileModifiedAt: integer("file_modified_at").notNull(),
  },
  (table) => ({
    idxMemoriesFilePath: uniqueIndex("idx_memories_file_path").on(table.filePath),
    idxMemoriesLayer: index("idx_memories_layer").on(table.layer),
    idxMemoriesType: index("idx_memories_type").on(table.memoryType),
    idxMemoriesLifecycle: index("idx_memories_lifecycle").on(table.lifecycle),
    idxMemoriesScore: index("idx_memories_score").on(table.utilityScore),
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
    prevHash: text("prev_hash").notNull().default(""),
  },
  (table) => ({
    idxAuditLogTs: index("idx_audit_log_ts").on(table.ts),
    idxAuditLogEntity: index("idx_audit_log_entity").on(table.entityType, table.entityId, table.ts),
  }),
);
