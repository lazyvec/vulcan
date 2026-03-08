import { randomUUID } from "node:crypto";
import { and, desc, eq, gt, like, or, sql } from "drizzle-orm";
import { statusFromEventType } from "@vulcan/shared/constants";
import type {
  Agent,
  AgentCommand,
  AgentCommandMode,
  AgentCommandStatus,
  AgentStatus,
  AuditLogItem,
  DocItem,
  EventItem,
  GatewayInfo,
  IngestEventInput,
  MemoryItem,
  Project,
  Schedule,
  Task,
  TaskComment,
  TaskDependency,
  TaskLane,
  TaskPriority,
} from "@vulcan/shared/types";
import { db, ensureSchema } from "./db";
import {
  agentCommandsTable,
  agentsTable,
  auditLogTable,
  docsTable,
  eventsTable,
  gatewaysTable,
  memoryItemsTable,
  projectsTable,
  schedulesTable,
  taskCommentsTable,
  taskDependenciesTable,
  tasksTable,
} from "./schema";

const DEFAULT_SOURCE = "openclaw";

function parseStringArray(raw: string | null | undefined): string[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function parseJsonRecord(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

function mapAgent(row: typeof agentsTable.$inferSelect): Agent {
  return {
    id: row.id,
    name: row.name,
    roleTags: parseStringArray(row.roleTags),
    mission: row.mission,
    avatarKey: row.avatarKey,
    status: row.status as AgentStatus,
    statusSince: row.statusSince,
    lastSeenAt: row.lastSeenAt,
    skills: parseStringArray(row.skills),
    config: parseJsonRecord(row.configJson),
    isActive: row.isActive !== 0,
    gatewayId: row.gatewayId,
    capabilities: parseStringArray(row.capabilities),
  };
}

function mapProject(row: typeof projectsTable.$inferSelect): Project {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    progress: row.progress,
    priority: row.priority,
    ownerAgentId: row.ownerAgentId,
    updatedAt: row.updatedAt,
  };
}

function mapTask(row: typeof tasksTable.$inferSelect): Task {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    description: row.description ?? null,
    assigneeAgentId: row.assigneeAgentId,
    lane: row.lane as TaskLane,
    priority: (row.priority ?? "medium") as TaskPriority,
    dueAt: row.dueAt ?? null,
    tags: parseStringArray(row.tags),
    parentTaskId: row.parentTaskId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapTaskComment(row: typeof taskCommentsTable.$inferSelect): TaskComment {
  return {
    id: row.id,
    taskId: row.taskId,
    author: row.author,
    content: row.content,
    createdAt: row.createdAt,
  };
}

function mapTaskDependency(row: typeof taskDependenciesTable.$inferSelect): TaskDependency {
  return {
    id: row.id,
    taskId: row.taskId,
    dependsOnTaskId: row.dependsOnTaskId,
    createdAt: row.createdAt,
  };
}

function mapEvent(row: typeof eventsTable.$inferSelect): EventItem {
  return {
    id: row.id,
    ts: row.ts,
    source: row.source,
    agentId: row.agentId,
    projectId: row.projectId,
    taskId: row.taskId,
    type: row.type,
    summary: row.summary,
    payloadJson: row.payloadJson,
  };
}

function mapMemory(row: typeof memoryItemsTable.$inferSelect): MemoryItem {
  return {
    id: row.id,
    container: row.container as "journal" | "longterm",
    title: row.title,
    content: row.content,
    tags: parseStringArray(row.tags),
    sourceRef: row.sourceRef,
    createdAt: row.createdAt,
  };
}

function mapDoc(row: typeof docsTable.$inferSelect): DocItem {
  return {
    id: row.id,
    title: row.title,
    tags: parseStringArray(row.tags),
    format: row.format,
    content: row.content,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapSchedule(row: typeof schedulesTable.$inferSelect): Schedule {
  return {
    id: row.id,
    name: row.name,
    cronOrInterval: row.cronOrInterval,
    status: row.status as "scheduled" | "running",
    lastRunAt: row.lastRunAt,
    nextRunAt: row.nextRunAt,
    ownerAgentId: row.ownerAgentId,
  };
}

function mapGateway(row: typeof gatewaysTable.$inferSelect): GatewayInfo {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    protocol: row.protocol,
    status: row.status,
    lastSeenAt: row.lastSeenAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapAgentCommand(row: typeof agentCommandsTable.$inferSelect): AgentCommand {
  return {
    id: row.id,
    agentId: row.agentId,
    mode: row.mode as AgentCommandMode,
    command: row.command,
    payloadJson: row.payloadJson,
    status: row.status as AgentCommandStatus,
    gatewayCommandId: row.gatewayCommandId,
    error: row.error,
    requestedBy: row.requestedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    executedAt: row.executedAt,
  };
}

function mapAuditLog(row: typeof auditLogTable.$inferSelect): AuditLogItem {
  return {
    id: row.id,
    ts: row.ts,
    actor: row.actor,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    source: row.source,
    beforeJson: row.beforeJson,
    afterJson: row.afterJson,
    metadataJson: row.metadataJson,
  };
}

export function getAgents(options?: { includeInactive?: boolean }): Agent[] {
  ensureSchema();
  return db
    .select()
    .from(agentsTable)
    .where(options?.includeInactive ? undefined : eq(agentsTable.isActive, 1))
    .orderBy(agentsTable.name)
    .all()
    .map(mapAgent);
}

export function getAgentById(id: string): Agent | null {
  ensureSchema();
  const row = db.select().from(agentsTable).where(eq(agentsTable.id, id)).get();
  return row ? mapAgent(row) : null;
}

type MutableAgentFields = {
  name?: string;
  mission?: string;
  roleTags?: string[];
  avatarKey?: string;
  status?: AgentStatus;
  skills?: string[];
  capabilities?: string[];
  config?: Record<string, unknown>;
  gatewayId?: string | null;
  isActive?: boolean;
};

export function createAgent(
  input: {
    id?: string;
    name: string;
    mission: string;
  } & MutableAgentFields,
): Agent {
  ensureSchema();
  const now = Date.now();
  const row: typeof agentsTable.$inferInsert = {
    id: input.id ?? randomUUID(),
    name: input.name,
    mission: input.mission,
    roleTags: JSON.stringify(input.roleTags ?? []),
    avatarKey: input.avatarKey ?? "seed",
    status: input.status ?? "idle",
    statusSince: now,
    lastSeenAt: now,
    skills: JSON.stringify(input.skills ?? []),
    configJson: JSON.stringify(input.config ?? {}),
    isActive: input.isActive === false ? 0 : 1,
    gatewayId: input.gatewayId ?? null,
    capabilities: JSON.stringify(input.capabilities ?? []),
  };

  db.insert(agentsTable).values(row).run();

  const created = db.select().from(agentsTable).where(eq(agentsTable.id, row.id)).get();
  if (!created) {
    throw new Error("failed to create agent");
  }
  return mapAgent(created);
}

export function updateAgent(id: string, input: MutableAgentFields): Agent | null {
  ensureSchema();
  const existing = db.select().from(agentsTable).where(eq(agentsTable.id, id)).get();
  if (!existing) {
    return null;
  }

  const nextValues: Partial<typeof agentsTable.$inferInsert> = {};
  if (typeof input.name === "string") {
    nextValues.name = input.name;
  }
  if (typeof input.mission === "string") {
    nextValues.mission = input.mission;
  }
  if (typeof input.avatarKey === "string") {
    nextValues.avatarKey = input.avatarKey;
  }
  if (typeof input.status === "string") {
    nextValues.status = input.status;
    nextValues.statusSince = Date.now();
    nextValues.lastSeenAt = Date.now();
  }
  if (Array.isArray(input.roleTags)) {
    nextValues.roleTags = JSON.stringify(input.roleTags);
  }
  if (Array.isArray(input.skills)) {
    nextValues.skills = JSON.stringify(input.skills);
  }
  if (Array.isArray(input.capabilities)) {
    nextValues.capabilities = JSON.stringify(input.capabilities);
  }
  if (input.config && typeof input.config === "object") {
    nextValues.configJson = JSON.stringify(input.config);
  }
  if (Object.prototype.hasOwnProperty.call(input, "gatewayId")) {
    nextValues.gatewayId = input.gatewayId ?? null;
  }
  if (typeof input.isActive === "boolean") {
    nextValues.isActive = input.isActive ? 1 : 0;
  }

  if (Object.keys(nextValues).length > 0) {
    db.update(agentsTable).set(nextValues).where(eq(agentsTable.id, id)).run();
  }

  const updated = db.select().from(agentsTable).where(eq(agentsTable.id, id)).get();
  return updated ? mapAgent(updated) : null;
}

export function deactivateAgent(id: string): Agent | null {
  ensureSchema();
  const now = Date.now();
  db.update(agentsTable)
    .set({ isActive: 0, status: "idle", statusSince: now })
    .where(eq(agentsTable.id, id))
    .run();
  const row = db.select().from(agentsTable).where(eq(agentsTable.id, id)).get();
  return row ? mapAgent(row) : null;
}

export function getGateways(): GatewayInfo[] {
  ensureSchema();
  return db
    .select()
    .from(gatewaysTable)
    .orderBy(desc(gatewaysTable.updatedAt))
    .all()
    .map(mapGateway);
}

export function upsertGateway(input: {
  id: string;
  name: string;
  url: string;
  protocol?: string;
  status: string;
  lastSeenAt?: number | null;
}): GatewayInfo {
  ensureSchema();
  const now = Date.now();
  const existing = db.select().from(gatewaysTable).where(eq(gatewaysTable.id, input.id)).get();

  if (existing) {
    db.update(gatewaysTable)
      .set({
        name: input.name,
        url: input.url,
        protocol: input.protocol ?? existing.protocol,
        status: input.status,
        lastSeenAt: input.lastSeenAt ?? existing.lastSeenAt,
        updatedAt: now,
      })
      .where(eq(gatewaysTable.id, input.id))
      .run();
  } else {
    db.insert(gatewaysTable)
      .values({
        id: input.id,
        name: input.name,
        url: input.url,
        protocol: input.protocol ?? "ws-rpc-v3",
        status: input.status,
        lastSeenAt: input.lastSeenAt ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }

  const row = db.select().from(gatewaysTable).where(eq(gatewaysTable.id, input.id)).get();
  if (!row) {
    throw new Error("failed to upsert gateway");
  }
  return mapGateway(row);
}

export function getProjects(): Project[] {
  ensureSchema();
  return db
    .select()
    .from(projectsTable)
    .orderBy(desc(projectsTable.updatedAt))
    .all()
    .map(mapProject);
}

export function getTasks(filters?: {
  lane?: TaskLane | "all";
  q?: string;
  projectId?: string;
  assigneeAgentId?: string;
  priority?: TaskPriority;
  parentTaskId?: string | null;
}): Task[] {
  ensureSchema();
  const conditions = [];

  if (filters?.lane && filters.lane !== "all") {
    conditions.push(eq(tasksTable.lane, filters.lane));
  }

  if (filters?.projectId) {
    conditions.push(eq(tasksTable.projectId, filters.projectId));
  }

  if (filters?.assigneeAgentId) {
    conditions.push(eq(tasksTable.assigneeAgentId, filters.assigneeAgentId));
  }

  if (filters?.priority) {
    conditions.push(eq(tasksTable.priority, filters.priority));
  }

  if (filters?.parentTaskId !== undefined) {
    conditions.push(
      filters.parentTaskId === null
        ? sql`${tasksTable.parentTaskId} IS NULL`
        : eq(tasksTable.parentTaskId, filters.parentTaskId),
    );
  }

  if (filters?.q?.trim()) {
    const query = `%${filters.q.trim()}%`;
    conditions.push(
      or(
        like(tasksTable.title, query),
        like(tasksTable.description, query),
        like(tasksTable.assigneeAgentId, query),
        like(tasksTable.projectId, query),
      ),
    );
  }

  return db
    .select()
    .from(tasksTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(tasksTable.updatedAt))
    .all()
    .map(mapTask);
}

export function getTaskById(id: string): Task | null {
  ensureSchema();
  const row = db.select().from(tasksTable).where(eq(tasksTable.id, id)).get();
  return row ? mapTask(row) : null;
}

export function updateTaskLane(id: string, lane: TaskLane): Task | null {
  ensureSchema();
  const updatedAt = Date.now();

  db.update(tasksTable)
    .set({ lane, updatedAt })
    .where(eq(tasksTable.id, id))
    .run();

  const row = db.select().from(tasksTable).where(eq(tasksTable.id, id)).get();
  return row ? mapTask(row) : null;
}

export function createTask(input: {
  id?: string;
  projectId?: string | null;
  title: string;
  description?: string | null;
  assigneeAgentId?: string | null;
  lane?: TaskLane;
  priority?: TaskPriority;
  dueAt?: number | null;
  tags?: string[];
  parentTaskId?: string | null;
}): Task {
  ensureSchema();
  const now = Date.now();
  const row: typeof tasksTable.$inferInsert = {
    id: input.id ?? randomUUID(),
    projectId: input.projectId ?? null,
    title: input.title,
    description: input.description ?? null,
    assigneeAgentId: input.assigneeAgentId ?? null,
    lane: input.lane ?? "backlog",
    priority: input.priority ?? "medium",
    dueAt: input.dueAt ?? null,
    tags: JSON.stringify(input.tags ?? []),
    parentTaskId: input.parentTaskId ?? null,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(tasksTable).values(row).run();
  const created = db.select().from(tasksTable).where(eq(tasksTable.id, row.id)).get();
  if (!created) {
    throw new Error("failed to create task");
  }
  return mapTask(created);
}

export function updateTask(
  id: string,
  input: {
    title?: string;
    description?: string | null;
    assigneeAgentId?: string | null;
    lane?: TaskLane;
    priority?: TaskPriority;
    dueAt?: number | null;
    tags?: string[];
    parentTaskId?: string | null;
    projectId?: string | null;
  },
): Task | null {
  ensureSchema();
  const existing = db.select().from(tasksTable).where(eq(tasksTable.id, id)).get();
  if (!existing) {
    return null;
  }

  const nextValues: Partial<typeof tasksTable.$inferInsert> = {
    updatedAt: Date.now(),
  };

  if (typeof input.title === "string") nextValues.title = input.title;
  if (Object.prototype.hasOwnProperty.call(input, "description")) {
    nextValues.description = input.description ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(input, "assigneeAgentId")) {
    nextValues.assigneeAgentId = input.assigneeAgentId ?? null;
  }
  if (typeof input.lane === "string") nextValues.lane = input.lane;
  if (typeof input.priority === "string") nextValues.priority = input.priority;
  if (Object.prototype.hasOwnProperty.call(input, "dueAt")) {
    nextValues.dueAt = input.dueAt ?? null;
  }
  if (Array.isArray(input.tags)) nextValues.tags = JSON.stringify(input.tags);
  if (Object.prototype.hasOwnProperty.call(input, "parentTaskId")) {
    nextValues.parentTaskId = input.parentTaskId ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(input, "projectId")) {
    nextValues.projectId = input.projectId ?? null;
  }

  db.update(tasksTable).set(nextValues).where(eq(tasksTable.id, id)).run();
  const updated = db.select().from(tasksTable).where(eq(tasksTable.id, id)).get();
  return updated ? mapTask(updated) : null;
}

export function deleteTask(id: string): boolean {
  ensureSchema();
  const existing = db.select().from(tasksTable).where(eq(tasksTable.id, id)).get();
  if (!existing) return false;
  db.delete(taskDependenciesTable)
    .where(
      or(eq(taskDependenciesTable.taskId, id), eq(taskDependenciesTable.dependsOnTaskId, id)),
    )
    .run();
  db.delete(taskCommentsTable).where(eq(taskCommentsTable.taskId, id)).run();
  db.delete(tasksTable).where(eq(tasksTable.id, id)).run();
  return true;
}

export function addTaskComment(input: {
  taskId: string;
  author?: string;
  content: string;
}): TaskComment {
  ensureSchema();
  const now = Date.now();
  const row: typeof taskCommentsTable.$inferInsert = {
    id: randomUUID(),
    taskId: input.taskId,
    author: input.author ?? "human",
    content: input.content,
    createdAt: now,
  };
  db.insert(taskCommentsTable).values(row).run();
  const created = db
    .select()
    .from(taskCommentsTable)
    .where(eq(taskCommentsTable.id, row.id))
    .get();
  if (!created) throw new Error("failed to create task comment");
  return mapTaskComment(created);
}

export function getTaskComments(taskId: string): TaskComment[] {
  ensureSchema();
  return db
    .select()
    .from(taskCommentsTable)
    .where(eq(taskCommentsTable.taskId, taskId))
    .orderBy(taskCommentsTable.createdAt)
    .all()
    .map(mapTaskComment);
}

export function addTaskDependency(input: {
  taskId: string;
  dependsOnTaskId: string;
}): TaskDependency {
  ensureSchema();
  const now = Date.now();
  const row: typeof taskDependenciesTable.$inferInsert = {
    id: randomUUID(),
    taskId: input.taskId,
    dependsOnTaskId: input.dependsOnTaskId,
    createdAt: now,
  };
  db.insert(taskDependenciesTable).values(row).run();
  const created = db
    .select()
    .from(taskDependenciesTable)
    .where(eq(taskDependenciesTable.id, row.id))
    .get();
  if (!created) throw new Error("failed to create task dependency");
  return mapTaskDependency(created);
}

export function getTaskDependencies(taskId: string): TaskDependency[] {
  ensureSchema();
  return db
    .select()
    .from(taskDependenciesTable)
    .where(
      or(eq(taskDependenciesTable.taskId, taskId), eq(taskDependenciesTable.dependsOnTaskId, taskId)),
    )
    .orderBy(taskDependenciesTable.createdAt)
    .all()
    .map(mapTaskDependency);
}

export function deleteTaskDependency(id: string): boolean {
  ensureSchema();
  const existing = db
    .select()
    .from(taskDependenciesTable)
    .where(eq(taskDependenciesTable.id, id))
    .get();
  if (!existing) return false;
  db.delete(taskDependenciesTable).where(eq(taskDependenciesTable.id, id)).run();
  return true;
}

export function getLatestEvents(limit = 80): EventItem[] {
  ensureSchema();
  return db
    .select()
    .from(eventsTable)
    .orderBy(desc(eventsTable.ts))
    .limit(limit)
    .all()
    .map(mapEvent)
    .reverse();
}

export function getEventsSince(ts: number): EventItem[] {
  ensureSchema();
  return db
    .select()
    .from(eventsTable)
    .where(gt(eventsTable.ts, ts))
    .orderBy(eventsTable.ts)
    .all()
    .map(mapEvent);
}

export function appendEvent(input: IngestEventInput): EventItem {
  ensureSchema();
  const event: typeof eventsTable.$inferInsert = {
    id: input.id ?? randomUUID(),
    ts: input.ts ?? Date.now(),
    source: input.source ?? DEFAULT_SOURCE,
    agentId: input.agentId ?? null,
    projectId: input.projectId ?? null,
    taskId: input.taskId ?? null,
    type: input.type,
    summary: input.summary,
    payloadJson: input.payloadJson ?? "{}",
  };

  db.insert(eventsTable).values(event).run();

  if (event.agentId) {
    const mappedStatus: AgentStatus = statusFromEventType(event.type);

    db.update(agentsTable)
      .set({ status: mappedStatus, statusSince: event.ts, lastSeenAt: event.ts })
      .where(eq(agentsTable.id, event.agentId))
      .run();
  }

  return mapEvent(event as typeof eventsTable.$inferSelect);
}

export function getMemoryItems(container?: "journal" | "longterm"): MemoryItem[] {
  ensureSchema();
  const rows = db
    .select()
    .from(memoryItemsTable)
    .where(container ? eq(memoryItemsTable.container, container) : undefined)
    .orderBy(desc(memoryItemsTable.createdAt))
    .all();
  return rows.map(mapMemory);
}

export function getDocs(query?: string): DocItem[] {
  ensureSchema();
  const rows = db
    .select()
    .from(docsTable)
    .where(
      query?.trim()
        ? or(
            like(docsTable.title, `%${query.trim()}%`),
            like(docsTable.tags, `%${query.trim()}%`),
            like(docsTable.content, `%${query.trim()}%`),
          )
        : undefined,
    )
    .orderBy(desc(docsTable.updatedAt))
    .all();

  return rows.map(mapDoc);
}

export function getSchedules(): Schedule[] {
  ensureSchema();
  return db
    .select()
    .from(schedulesTable)
    .orderBy(
      sql`CASE WHEN ${schedulesTable.status} = 'running' THEN 0 ELSE 1 END`,
      schedulesTable.nextRunAt,
    )
    .all()
    .map(mapSchedule);
}

export function createAgentCommand(input: {
  id?: string;
  agentId: string;
  mode: AgentCommandMode;
  command: string;
  payloadJson?: string;
  status?: AgentCommandStatus;
  requestedBy?: string;
}): AgentCommand {
  ensureSchema();
  const now = Date.now();
  const row: typeof agentCommandsTable.$inferInsert = {
    id: input.id ?? randomUUID(),
    agentId: input.agentId,
    mode: input.mode,
    command: input.command,
    payloadJson: input.payloadJson ?? "{}",
    status: input.status ?? "queued",
    gatewayCommandId: null,
    error: null,
    requestedBy: input.requestedBy ?? "human",
    createdAt: now,
    updatedAt: now,
    executedAt: null,
  };
  db.insert(agentCommandsTable).values(row).run();
  const created = db
    .select()
    .from(agentCommandsTable)
    .where(eq(agentCommandsTable.id, row.id))
    .get();
  if (!created) {
    throw new Error("failed to create agent command");
  }
  return mapAgentCommand(created);
}

export function updateAgentCommand(
  id: string,
  input: {
    status?: AgentCommandStatus;
    gatewayCommandId?: string | null;
    error?: string | null;
    executedAt?: number | null;
  },
): AgentCommand | null {
  ensureSchema();
  const updateSet: Partial<typeof agentCommandsTable.$inferInsert> = {
    updatedAt: Date.now(),
  };

  if (input.status) {
    updateSet.status = input.status;
  }
  if (Object.prototype.hasOwnProperty.call(input, "gatewayCommandId")) {
    updateSet.gatewayCommandId = input.gatewayCommandId ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(input, "error")) {
    updateSet.error = input.error ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(input, "executedAt")) {
    updateSet.executedAt = input.executedAt ?? null;
  }

  db.update(agentCommandsTable).set(updateSet).where(eq(agentCommandsTable.id, id)).run();
  const row = db.select().from(agentCommandsTable).where(eq(agentCommandsTable.id, id)).get();
  return row ? mapAgentCommand(row) : null;
}

export function getAgentCommandById(id: string): AgentCommand | null {
  ensureSchema();
  const row = db.select().from(agentCommandsTable).where(eq(agentCommandsTable.id, id)).get();
  return row ? mapAgentCommand(row) : null;
}

export function getAgentCommands(filters?: {
  agentId?: string;
  status?: AgentCommandStatus | "all";
  limit?: number;
}): AgentCommand[] {
  ensureSchema();
  const conditions = [];

  if (filters?.agentId) {
    conditions.push(eq(agentCommandsTable.agentId, filters.agentId));
  }

  if (filters?.status && filters.status !== "all") {
    conditions.push(eq(agentCommandsTable.status, filters.status));
  }

  const limit =
    typeof filters?.limit === "number" && Number.isFinite(filters.limit) && filters.limit > 0
      ? Math.min(filters.limit, 300)
      : 80;

  return db
    .select()
    .from(agentCommandsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(agentCommandsTable.createdAt))
    .limit(limit)
    .all()
    .map(mapAgentCommand);
}

export function appendAuditLog(input: {
  id?: string;
  actor?: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  source?: string;
  beforeJson?: string;
  afterJson?: string;
  metadataJson?: string;
}): AuditLogItem {
  ensureSchema();
  const row: typeof auditLogTable.$inferInsert = {
    id: input.id ?? randomUUID(),
    ts: Date.now(),
    actor: input.actor ?? "human",
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    source: input.source ?? "api",
    beforeJson: input.beforeJson ?? "{}",
    afterJson: input.afterJson ?? "{}",
    metadataJson: input.metadataJson ?? "{}",
  };
  db.insert(auditLogTable).values(row).run();
  const created = db.select().from(auditLogTable).where(eq(auditLogTable.id, row.id)).get();
  if (!created) {
    throw new Error("failed to append audit log");
  }
  return mapAuditLog(created);
}

export function getAuditLogs(limit = 80): AuditLogItem[] {
  ensureSchema();
  return db
    .select()
    .from(auditLogTable)
    .orderBy(desc(auditLogTable.ts))
    .limit(limit)
    .all()
    .map(mapAuditLog);
}

export function countRecords() {
  ensureSchema();

  const [agentsCount] = db.select({ count: sql<number>`count(*)` }).from(agentsTable).all();
  const [projectsCount] = db
    .select({ count: sql<number>`count(*)` })
    .from(projectsTable)
    .all();
  const [tasksCount] = db.select({ count: sql<number>`count(*)` }).from(tasksTable).all();
  const [eventsCount] = db.select({ count: sql<number>`count(*)` }).from(eventsTable).all();
  const [gatewaysCount] = db.select({ count: sql<number>`count(*)` }).from(gatewaysTable).all();
  const [commandsCount] = db
    .select({ count: sql<number>`count(*)` })
    .from(agentCommandsTable)
    .all();
  const [auditCount] = db.select({ count: sql<number>`count(*)` }).from(auditLogTable).all();

  return {
    agents: agentsCount?.count ?? 0,
    projects: projectsCount?.count ?? 0,
    tasks: tasksCount?.count ?? 0,
    events: eventsCount?.count ?? 0,
    gateways: gatewaysCount?.count ?? 0,
    commands: commandsCount?.count ?? 0,
    auditLogs: auditCount?.count ?? 0,
  };
}
