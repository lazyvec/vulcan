import { randomUUID } from "node:crypto";
import { and, desc, eq, gt, like, or, sql } from "drizzle-orm";
import { statusFromEventType } from "@vulcan/shared/constants";
import type {
  ActivityStats,
  Agent,
  AgentCommand,
  AgentCommandMode,
  AgentCommandStatus,
  AgentSkill,
  AgentStatus,
  Approval,
  ApprovalPolicy,
  ApprovalStatus,
  AuditLogItem,
  DocItem,
  EventItem,
  GatewayInfo,
  IngestEventInput,
  MemoryItem,
  Project,
  Schedule,
  Skill,
  SkillCategory,
  SkillRegistryEntry,
  Task,
  TaskComment,
  TaskDependency,
  TaskLane,
  TaskPriority,
} from "@vulcan/shared/types";
import { db, ensureSchema, getSqlite } from "./db";
import type {
  CircuitBreakerConfig,
  DailyCostSummary,
  NotificationCategory,
  NotificationLog,
  NotificationPreference,
  TraceEnvelope,
  TraceStatus,
  TraceType,
  WorkOrder,
  WorkOrderStatus,
  WorkOrderType,
  WorkResult,
  WorkResultStatus,
} from "@vulcan/shared/types";
import {
  agentCommandsTable,
  agentSkillsTable,
  agentsTable,
  approvalPoliciesTable,
  approvalsTable,
  auditLogTable,
  docsTable,
  eventsTable,
  gatewaysTable,
  memoryItemsTable,
  notificationLogsTable,
  notificationPreferencesTable,
  projectsTable,
  schedulesTable,
  skillRegistryTable,
  skillsTable,
  circuitBreakerConfigTable,
  taskCommentsTable,
  taskDependenciesTable,
  tasksTable,
  tracesTable,
  workOrdersTable,
  workResultsTable,
} from "./schema";

const DEFAULT_SOURCE = "openclaw";

export function parseStringArray(raw: string | null | undefined): string[] {
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

export function parseJsonRecord(raw: string | null | undefined): Record<string, unknown> {
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
    container: row.container as MemoryItem["container"],
    title: row.title,
    content: row.content,
    tags: parseStringArray(row.tags),
    sourceRef: row.sourceRef,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt ?? undefined,
    importance: row.importance ?? undefined,
    expiresAt: row.expiresAt ?? undefined,
    memoryType: (row.memoryType as MemoryItem["memoryType"]) ?? undefined,
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

export function getMemoryItems(container?: MemoryItem["container"]): MemoryItem[] {
  ensureSchema();
  const rows = db
    .select()
    .from(memoryItemsTable)
    .where(container ? eq(memoryItemsTable.container, container) : undefined)
    .orderBy(desc(memoryItemsTable.createdAt))
    .all();
  return rows.map(mapMemory);
}

export function createMemoryItem(input: {
  container: MemoryItem["container"];
  title: string;
  content: string;
  tags?: string[];
  sourceRef?: string;
  importance?: number;
  expiresAt?: number;
  memoryType?: MemoryItem["memoryType"];
}): MemoryItem {
  ensureSchema();
  const id = randomUUID();
  const now = Date.now();
  db.insert(memoryItemsTable)
    .values({
      id,
      container: input.container,
      title: input.title,
      content: input.content,
      tags: JSON.stringify(input.tags ?? []),
      sourceRef: input.sourceRef ?? null,
      createdAt: now,
      updatedAt: now,
      importance: input.importance ?? null,
      expiresAt: input.expiresAt ?? null,
      memoryType: input.memoryType ?? null,
    })
    .run();
  const row = db
    .select()
    .from(memoryItemsTable)
    .where(eq(memoryItemsTable.id, id))
    .get();
  return mapMemory(row!);
}

export function updateMemoryItem(
  id: string,
  patch: {
    title?: string;
    content?: string;
    tags?: string[];
    container?: MemoryItem["container"];
    importance?: number;
    expiresAt?: number | null;
    memoryType?: MemoryItem["memoryType"];
  },
): MemoryItem | null {
  ensureSchema();
  const existing = db
    .select()
    .from(memoryItemsTable)
    .where(eq(memoryItemsTable.id, id))
    .get();
  if (!existing) return null;

  const updates: Record<string, unknown> = { updatedAt: Date.now() };
  if (patch.title !== undefined) updates.title = patch.title;
  if (patch.content !== undefined) updates.content = patch.content;
  if (patch.tags !== undefined) updates.tags = JSON.stringify(patch.tags);
  if (patch.container !== undefined) updates.container = patch.container;
  if (patch.importance !== undefined) updates.importance = patch.importance;
  if (patch.expiresAt !== undefined) updates.expiresAt = patch.expiresAt;
  if (patch.memoryType !== undefined) updates.memoryType = patch.memoryType;

  db.update(memoryItemsTable)
    .set(updates)
    .where(eq(memoryItemsTable.id, id))
    .run();

  const row = db
    .select()
    .from(memoryItemsTable)
    .where(eq(memoryItemsTable.id, id))
    .get();
  return mapMemory(row!);
}

export function deleteMemoryItem(id: string): boolean {
  ensureSchema();
  const result = db
    .delete(memoryItemsTable)
    .where(eq(memoryItemsTable.id, id))
    .run();
  return result.changes > 0;
}

export function searchMemoryItems(query: string, container?: MemoryItem["container"]): MemoryItem[] {
  ensureSchema();
  const q = query.trim();
  if (!q) return getMemoryItems(container);

  const conditions = [
    or(
      like(memoryItemsTable.title, `%${q}%`),
      like(memoryItemsTable.content, `%${q}%`),
      like(memoryItemsTable.tags, `%${q}%`),
    ),
  ];
  if (container) {
    conditions.push(eq(memoryItemsTable.container, container));
  }

  const rows = db
    .select()
    .from(memoryItemsTable)
    .where(and(...conditions))
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

// ── Activity / Audit Filtered ────────────────────────────────────────────────

export function getActivityEvents(filters?: {
  type?: string;
  agentId?: string;
  source?: string;
  since?: number;
  until?: number;
  limit?: number;
  offset?: number;
}): { events: EventItem[]; total: number } {
  ensureSchema();
  const conditions: ReturnType<typeof eq>[] = [];

  if (filters?.type) {
    conditions.push(eq(eventsTable.type, filters.type));
  }
  if (filters?.agentId) {
    conditions.push(eq(eventsTable.agentId, filters.agentId));
  }
  if (filters?.source) {
    conditions.push(eq(eventsTable.source, filters.source));
  }
  if (filters?.since && Number.isFinite(filters.since)) {
    conditions.push(gt(eventsTable.ts, filters.since));
  }
  if (filters?.until && Number.isFinite(filters.until)) {
    conditions.push(sql`${eventsTable.ts} <= ${filters.until}`);
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [countRow] = db
    .select({ count: sql<number>`count(*)` })
    .from(eventsTable)
    .where(where)
    .all();
  const total = countRow?.count ?? 0;

  const limit =
    typeof filters?.limit === "number" && Number.isFinite(filters.limit) && filters.limit > 0
      ? Math.min(filters.limit, 300)
      : 50;
  const offset =
    typeof filters?.offset === "number" && Number.isFinite(filters.offset) && filters.offset >= 0
      ? filters.offset
      : 0;

  const events = db
    .select()
    .from(eventsTable)
    .where(where)
    .orderBy(desc(eventsTable.ts))
    .limit(limit)
    .offset(offset)
    .all()
    .map(mapEvent);

  return { events, total };
}

export function getAuditLogsFiltered(filters?: {
  action?: string;
  entityType?: string;
  entityId?: string;
  since?: number;
  until?: number;
  limit?: number;
  offset?: number;
}): { logs: AuditLogItem[]; total: number } {
  ensureSchema();
  const conditions: ReturnType<typeof eq>[] = [];

  if (filters?.action) {
    conditions.push(eq(auditLogTable.action, filters.action));
  }
  if (filters?.entityType) {
    conditions.push(eq(auditLogTable.entityType, filters.entityType));
  }
  if (filters?.entityId) {
    conditions.push(eq(auditLogTable.entityId, filters.entityId));
  }
  if (filters?.since && Number.isFinite(filters.since)) {
    conditions.push(gt(auditLogTable.ts, filters.since));
  }
  if (filters?.until && Number.isFinite(filters.until)) {
    conditions.push(sql`${auditLogTable.ts} <= ${filters.until}`);
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [countRow] = db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogTable)
    .where(where)
    .all();
  const total = countRow?.count ?? 0;

  const limit =
    typeof filters?.limit === "number" && Number.isFinite(filters.limit) && filters.limit > 0
      ? Math.min(filters.limit, 300)
      : 50;
  const offset =
    typeof filters?.offset === "number" && Number.isFinite(filters.offset) && filters.offset >= 0
      ? filters.offset
      : 0;

  const logs = db
    .select()
    .from(auditLogTable)
    .where(where)
    .orderBy(desc(auditLogTable.ts))
    .limit(limit)
    .offset(offset)
    .all()
    .map(mapAuditLog);

  return { logs, total };
}

export function getEventStats(since: number): ActivityStats {
  ensureSchema();

  const [totalRow] = db
    .select({ count: sql<number>`count(*)` })
    .from(eventsTable)
    .where(gt(eventsTable.ts, since))
    .all();

  const byTypeRows = db
    .select({
      type: eventsTable.type,
      count: sql<number>`count(*)`,
    })
    .from(eventsTable)
    .where(gt(eventsTable.ts, since))
    .groupBy(eventsTable.type)
    .all();

  const byAgentRows = db
    .select({
      agentId: eventsTable.agentId,
      count: sql<number>`count(*)`,
    })
    .from(eventsTable)
    .where(and(gt(eventsTable.ts, since), sql`${eventsTable.agentId} IS NOT NULL`))
    .groupBy(eventsTable.agentId)
    .all();

  const byHourRows = db
    .select({
      hour: sql<string>`strftime('%Y-%m-%d %H:00', ${eventsTable.ts} / 1000, 'unixepoch')`,
      count: sql<number>`count(*)`,
    })
    .from(eventsTable)
    .where(gt(eventsTable.ts, since))
    .groupBy(sql`strftime('%Y-%m-%d %H:00', ${eventsTable.ts} / 1000, 'unixepoch')`)
    .orderBy(sql`strftime('%Y-%m-%d %H:00', ${eventsTable.ts} / 1000, 'unixepoch')`)
    .all();

  const [errorRow] = db
    .select({ count: sql<number>`count(*)` })
    .from(eventsTable)
    .where(and(gt(eventsTable.ts, since), like(eventsTable.type, "%error%")))
    .all();

  const byType: Record<string, number> = {};
  for (const row of byTypeRows) {
    byType[row.type] = row.count;
  }

  const byAgent: Record<string, number> = {};
  for (const row of byAgentRows) {
    if (row.agentId) {
      byAgent[row.agentId] = row.count;
    }
  }

  return {
    totalEvents: totalRow?.count ?? 0,
    byType,
    byAgent,
    byHour: byHourRows.map((r) => ({ hour: r.hour, count: r.count })),
    errorCount: errorRow?.count ?? 0,
  };
}

// ── Skills Marketplace ──────────────────────────────────────────────────────

function mapSkill(row: typeof skillsTable.$inferSelect): Skill {
  return {
    id: row.id,
    name: row.name,
    displayName: row.displayName,
    description: row.description,
    category: row.category as SkillCategory,
    iconKey: row.iconKey,
    tags: parseStringArray(row.tags),
    isBuiltin: row.isBuiltin !== 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapAgentSkill(row: typeof agentSkillsTable.$inferSelect): AgentSkill {
  return {
    id: row.id,
    agentId: row.agentId,
    skillId: row.skillId,
    skillName: row.skillName,
    installedAt: row.installedAt,
    syncedAt: row.syncedAt,
  };
}

function mapSkillRegistry(row: typeof skillRegistryTable.$inferSelect): SkillRegistryEntry {
  return {
    id: row.id,
    name: row.name,
    discoveredFrom: row.discoveredFrom,
    firstSeenAt: row.firstSeenAt,
    lastSeenAt: row.lastSeenAt,
  };
}

export function getSkills(filters?: { category?: string; q?: string }): Skill[] {
  ensureSchema();
  const conditions = [];

  if (filters?.category) {
    conditions.push(eq(skillsTable.category, filters.category));
  }

  if (filters?.q?.trim()) {
    const query = `%${filters.q.trim()}%`;
    conditions.push(
      or(
        like(skillsTable.name, query),
        like(skillsTable.displayName, query),
        like(skillsTable.description, query),
        like(skillsTable.tags, query),
      ),
    );
  }

  return db
    .select()
    .from(skillsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(skillsTable.name)
    .all()
    .map(mapSkill);
}

export function getSkillById(id: string): Skill | null {
  ensureSchema();
  const row = db.select().from(skillsTable).where(eq(skillsTable.id, id)).get();
  return row ? mapSkill(row) : null;
}

export function getSkillByName(name: string): Skill | null {
  ensureSchema();
  const row = db.select().from(skillsTable).where(eq(skillsTable.name, name)).get();
  return row ? mapSkill(row) : null;
}

export function upsertSkill(input: {
  name: string;
  displayName?: string;
  description?: string;
  category?: string;
  iconKey?: string;
  tags?: string[];
  isBuiltin?: boolean;
}): Skill {
  ensureSchema();
  const now = Date.now();
  const existing = db.select().from(skillsTable).where(eq(skillsTable.name, input.name)).get();

  if (existing) {
    const nextValues: Partial<typeof skillsTable.$inferInsert> = { updatedAt: now };
    if (typeof input.displayName === "string") nextValues.displayName = input.displayName;
    if (typeof input.description === "string") nextValues.description = input.description;
    if (typeof input.category === "string") nextValues.category = input.category;
    if (typeof input.iconKey === "string") nextValues.iconKey = input.iconKey;
    if (Array.isArray(input.tags)) nextValues.tags = JSON.stringify(input.tags);
    if (typeof input.isBuiltin === "boolean") nextValues.isBuiltin = input.isBuiltin ? 1 : 0;

    db.update(skillsTable).set(nextValues).where(eq(skillsTable.id, existing.id)).run();
    const updated = db.select().from(skillsTable).where(eq(skillsTable.id, existing.id)).get();
    if (!updated) throw new Error("failed to update skill");
    return mapSkill(updated);
  }

  const row: typeof skillsTable.$inferInsert = {
    id: randomUUID(),
    name: input.name,
    displayName: input.displayName ?? input.name,
    description: input.description ?? "",
    category: input.category ?? "other",
    iconKey: input.iconKey ?? "zap",
    tags: JSON.stringify(input.tags ?? []),
    isBuiltin: input.isBuiltin ? 1 : 0,
    createdAt: now,
    updatedAt: now,
  };

  db.insert(skillsTable).values(row).run();
  const created = db.select().from(skillsTable).where(eq(skillsTable.id, row.id)).get();
  if (!created) throw new Error("failed to create skill");
  return mapSkill(created);
}

export function getAgentSkills(agentId: string): AgentSkill[] {
  ensureSchema();
  return db
    .select()
    .from(agentSkillsTable)
    .where(eq(agentSkillsTable.agentId, agentId))
    .orderBy(agentSkillsTable.skillName)
    .all()
    .map(mapAgentSkill);
}

export function installSkillToAgent(input: { agentId: string; skillName: string }): AgentSkill {
  ensureSchema();
  const now = Date.now();

  // 이미 설치된 경우 기존 반환
  const existing = db
    .select()
    .from(agentSkillsTable)
    .where(
      and(
        eq(agentSkillsTable.agentId, input.agentId),
        eq(agentSkillsTable.skillName, input.skillName),
      ),
    )
    .get();
  if (existing) return mapAgentSkill(existing);

  // 스킬이 없으면 자동 등록
  let skill = getSkillByName(input.skillName);
  if (!skill) {
    skill = upsertSkill({ name: input.skillName });
  }

  const row: typeof agentSkillsTable.$inferInsert = {
    id: randomUUID(),
    agentId: input.agentId,
    skillId: skill.id,
    skillName: input.skillName,
    installedAt: now,
    syncedAt: now,
  };

  db.insert(agentSkillsTable).values(row).run();
  const created = db
    .select()
    .from(agentSkillsTable)
    .where(eq(agentSkillsTable.id, row.id))
    .get();
  if (!created) throw new Error("failed to install skill");
  return mapAgentSkill(created);
}

export function removeSkillFromAgent(agentId: string, skillName: string): boolean {
  ensureSchema();
  const existing = db
    .select()
    .from(agentSkillsTable)
    .where(
      and(
        eq(agentSkillsTable.agentId, agentId),
        eq(agentSkillsTable.skillName, skillName),
      ),
    )
    .get();
  if (!existing) return false;
  db.delete(agentSkillsTable).where(eq(agentSkillsTable.id, existing.id)).run();
  return true;
}

export function syncAgentSkillsFromGateway(agentId: string, gatewaySkillNames: string[]): void {
  ensureSchema();
  const sqlite = getSqlite();

  sqlite.transaction(() => {
    const now = Date.now();

    // 현재 DB 스킬 목록
    const current = getAgentSkills(agentId);
    const currentNames = new Set(current.map((s) => s.skillName));
    const gatewayNames = new Set(gatewaySkillNames);

    // Gateway에 있고 DB에 없는 → 설치
    for (const name of gatewaySkillNames) {
      if (!currentNames.has(name)) {
        installSkillToAgent({ agentId, skillName: name });
      }
    }

    // DB에 있고 Gateway에 없는 → 제거
    for (const skill of current) {
      if (!gatewayNames.has(skill.skillName)) {
        removeSkillFromAgent(agentId, skill.skillName);
      }
    }

    // syncedAt 갱신
    db.update(agentSkillsTable)
      .set({ syncedAt: now })
      .where(eq(agentSkillsTable.agentId, agentId))
      .run();
  })();
}

export function upsertSkillRegistry(name: string, discoveredFrom: string): SkillRegistryEntry {
  ensureSchema();
  const now = Date.now();
  const existing = db
    .select()
    .from(skillRegistryTable)
    .where(eq(skillRegistryTable.name, name))
    .get();

  if (existing) {
    db.update(skillRegistryTable)
      .set({ lastSeenAt: now, discoveredFrom })
      .where(eq(skillRegistryTable.id, existing.id))
      .run();
    const updated = db
      .select()
      .from(skillRegistryTable)
      .where(eq(skillRegistryTable.id, existing.id))
      .get();
    if (!updated) throw new Error("failed to update skill registry");
    return mapSkillRegistry(updated);
  }

  const row: typeof skillRegistryTable.$inferInsert = {
    id: randomUUID(),
    name,
    discoveredFrom,
    firstSeenAt: now,
    lastSeenAt: now,
  };

  db.insert(skillRegistryTable).values(row).run();
  const created = db
    .select()
    .from(skillRegistryTable)
    .where(eq(skillRegistryTable.id, row.id))
    .get();
  if (!created) throw new Error("failed to create skill registry entry");
  return mapSkillRegistry(created);
}

export function getSkillRegistry(): SkillRegistryEntry[] {
  ensureSchema();
  return db
    .select()
    .from(skillRegistryTable)
    .orderBy(skillRegistryTable.name)
    .all()
    .map(mapSkillRegistry);
}

// ── Notification Preferences (Phase 7) ──────────────────────────────────────

function mapNotificationPreference(
  row: typeof notificationPreferencesTable.$inferSelect,
): NotificationPreference {
  return {
    id: row.id,
    userId: row.userId,
    chatId: row.chatId,
    enabledCategories: parseStringArray(row.enabledCategories) as NotificationCategory[],
    enabledTypes: parseStringArray(row.enabledTypes),
    silentHours: row.silentHoursJson ? parseJsonRecord(row.silentHoursJson) as { startHour: number; endHour: number } : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapNotificationLog(
  row: typeof notificationLogsTable.$inferSelect,
): NotificationLog {
  return {
    id: row.id,
    chatId: row.chatId,
    eventType: row.eventType,
    message: row.message,
    status: row.status as "sent" | "failed",
    error: row.error,
    sentAt: row.sentAt,
  };
}

export function getNotificationPreferences(): NotificationPreference | null {
  ensureSchema();
  const row = db
    .select()
    .from(notificationPreferencesTable)
    .where(eq(notificationPreferencesTable.userId, "default"))
    .get();
  return row ? mapNotificationPreference(row) : null;
}

export function upsertNotificationPreferences(input: {
  chatId?: string;
  enabledCategories?: string[];
  enabledTypes?: string[];
  silentHours?: { startHour: number; endHour: number } | null;
}): NotificationPreference {
  ensureSchema();
  const now = Date.now();
  const existing = db
    .select()
    .from(notificationPreferencesTable)
    .where(eq(notificationPreferencesTable.userId, "default"))
    .get();

  if (existing) {
    const nextValues: Partial<typeof notificationPreferencesTable.$inferInsert> = {
      updatedAt: now,
    };
    if (typeof input.chatId === "string") nextValues.chatId = input.chatId;
    if (Array.isArray(input.enabledCategories)) {
      nextValues.enabledCategories = JSON.stringify(input.enabledCategories);
    }
    if (Array.isArray(input.enabledTypes)) {
      nextValues.enabledTypes = JSON.stringify(input.enabledTypes);
    }
    if (Object.prototype.hasOwnProperty.call(input, "silentHours")) {
      nextValues.silentHoursJson = input.silentHours ? JSON.stringify(input.silentHours) : null;
    }

    db.update(notificationPreferencesTable)
      .set(nextValues)
      .where(eq(notificationPreferencesTable.id, existing.id))
      .run();
    const updated = db
      .select()
      .from(notificationPreferencesTable)
      .where(eq(notificationPreferencesTable.id, existing.id))
      .get();
    if (!updated) throw new Error("failed to update notification preferences");
    return mapNotificationPreference(updated);
  }

  const chatId = input.chatId ?? process.env.TELEGRAM_CHAT_ID ?? "";
  const row: typeof notificationPreferencesTable.$inferInsert = {
    id: randomUUID(),
    userId: "default",
    chatId,
    enabledCategories: JSON.stringify(
      input.enabledCategories ?? ["agent", "task", "command", "skill", "system", "gateway", "legacy"],
    ),
    enabledTypes: JSON.stringify(input.enabledTypes ?? []),
    silentHoursJson: input.silentHours ? JSON.stringify(input.silentHours) : null,
    createdAt: now,
    updatedAt: now,
  };

  db.insert(notificationPreferencesTable).values(row).run();
  const created = db
    .select()
    .from(notificationPreferencesTable)
    .where(eq(notificationPreferencesTable.id, row.id))
    .get();
  if (!created) throw new Error("failed to create notification preferences");
  return mapNotificationPreference(created);
}

export function appendNotificationLog(input: {
  chatId: string;
  eventType: string;
  message: string;
  status: "sent" | "failed";
  error?: string | null;
}): NotificationLog {
  ensureSchema();
  const row: typeof notificationLogsTable.$inferInsert = {
    id: randomUUID(),
    chatId: input.chatId,
    eventType: input.eventType,
    message: input.message,
    status: input.status,
    error: input.error ?? null,
    sentAt: Date.now(),
  };

  db.insert(notificationLogsTable).values(row).run();
  const created = db
    .select()
    .from(notificationLogsTable)
    .where(eq(notificationLogsTable.id, row.id))
    .get();
  if (!created) throw new Error("failed to create notification log");
  return mapNotificationLog(created);
}

export function getNotificationLogs(limit = 50): NotificationLog[] {
  ensureSchema();
  return db
    .select()
    .from(notificationLogsTable)
    .orderBy(desc(notificationLogsTable.sentAt))
    .limit(Math.min(limit, 200))
    .all()
    .map(mapNotificationLog);
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

// ── Approval / Governance (Phase 8) ──────────────────────────────────────────

function mapApprovalPolicy(
  row: typeof approvalPoliciesTable.$inferSelect,
): ApprovalPolicy {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    matchAgentId: row.matchAgentId,
    matchMode: row.matchMode as AgentCommandMode | null,
    matchCommandPattern: row.matchCommandPattern,
    autoApproveMinutes: row.autoApproveMinutes,
    isActive: row.isActive !== 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapApproval(
  row: typeof approvalsTable.$inferSelect,
): Approval {
  return {
    id: row.id,
    agentCommandId: row.agentCommandId,
    policyId: row.policyId,
    status: row.status as ApprovalStatus,
    requestedBy: row.requestedBy,
    resolvedBy: row.resolvedBy,
    resolvedReason: row.resolvedReason,
    expiresAt: row.expiresAt,
    telegramMessageId: row.telegramMessageId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function getApprovalPolicies(options?: { activeOnly?: boolean }): ApprovalPolicy[] {
  ensureSchema();
  const q = db.select().from(approvalPoliciesTable);
  if (options?.activeOnly) {
    return q
      .where(eq(approvalPoliciesTable.isActive, 1))
      .orderBy(desc(approvalPoliciesTable.createdAt))
      .all()
      .map(mapApprovalPolicy);
  }
  return q
    .orderBy(desc(approvalPoliciesTable.createdAt))
    .all()
    .map(mapApprovalPolicy);
}

export function getApprovalPolicyById(id: string): ApprovalPolicy | null {
  ensureSchema();
  const row = db
    .select()
    .from(approvalPoliciesTable)
    .where(eq(approvalPoliciesTable.id, id))
    .get();
  return row ? mapApprovalPolicy(row) : null;
}

export function createApprovalPolicy(input: {
  name: string;
  description?: string;
  matchAgentId?: string | null;
  matchMode?: string | null;
  matchCommandPattern?: string | null;
  autoApproveMinutes?: number | null;
  isActive?: boolean;
}): ApprovalPolicy {
  ensureSchema();
  const now = Date.now();
  const row: typeof approvalPoliciesTable.$inferInsert = {
    id: randomUUID(),
    name: input.name,
    description: input.description ?? "",
    matchAgentId: input.matchAgentId ?? null,
    matchMode: input.matchMode ?? null,
    matchCommandPattern: input.matchCommandPattern ?? null,
    autoApproveMinutes: input.autoApproveMinutes ?? null,
    isActive: input.isActive === false ? 0 : 1,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(approvalPoliciesTable).values(row).run();
  const created = db
    .select()
    .from(approvalPoliciesTable)
    .where(eq(approvalPoliciesTable.id, row.id))
    .get();
  if (!created) throw new Error("failed to create approval policy");
  return mapApprovalPolicy(created);
}

export function updateApprovalPolicy(
  id: string,
  input: {
    name?: string;
    description?: string;
    matchAgentId?: string | null;
    matchMode?: string | null;
    matchCommandPattern?: string | null;
    autoApproveMinutes?: number | null;
    isActive?: boolean;
  },
): ApprovalPolicy | null {
  ensureSchema();
  const updateSet: Partial<typeof approvalPoliciesTable.$inferInsert> = {
    updatedAt: Date.now(),
  };
  if (typeof input.name === "string") updateSet.name = input.name;
  if (typeof input.description === "string") updateSet.description = input.description;
  if (Object.prototype.hasOwnProperty.call(input, "matchAgentId")) {
    updateSet.matchAgentId = input.matchAgentId ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(input, "matchMode")) {
    updateSet.matchMode = input.matchMode ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(input, "matchCommandPattern")) {
    updateSet.matchCommandPattern = input.matchCommandPattern ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(input, "autoApproveMinutes")) {
    updateSet.autoApproveMinutes = input.autoApproveMinutes ?? null;
  }
  if (typeof input.isActive === "boolean") {
    updateSet.isActive = input.isActive ? 1 : 0;
  }

  db.update(approvalPoliciesTable)
    .set(updateSet)
    .where(eq(approvalPoliciesTable.id, id))
    .run();
  const row = db
    .select()
    .from(approvalPoliciesTable)
    .where(eq(approvalPoliciesTable.id, id))
    .get();
  return row ? mapApprovalPolicy(row) : null;
}

export function findMatchingPolicy(criteria: {
  agentId: string;
  mode: AgentCommandMode;
  command: string;
}): ApprovalPolicy | null {
  ensureSchema();
  const activePolicies = db
    .select()
    .from(approvalPoliciesTable)
    .where(eq(approvalPoliciesTable.isActive, 1))
    .all()
    .map(mapApprovalPolicy);

  let bestMatch: ApprovalPolicy | null = null;
  let bestScore = -1;

  for (const policy of activePolicies) {
    let score = 0;
    let matches = true;

    if (policy.matchAgentId) {
      if (policy.matchAgentId === criteria.agentId) {
        score += 4;
      } else {
        matches = false;
      }
    }

    if (policy.matchMode) {
      if (policy.matchMode === criteria.mode) {
        score += 2;
      } else {
        matches = false;
      }
    }

    if (policy.matchCommandPattern) {
      try {
        const re = new RegExp(policy.matchCommandPattern, "i");
        if (re.test(criteria.command)) {
          score += 1;
        } else {
          matches = false;
        }
      } catch {
        matches = false;
      }
    }

    if (matches && score > bestScore) {
      bestScore = score;
      bestMatch = policy;
    }
  }

  return bestMatch;
}

export function createApproval(input: {
  agentCommandId: string;
  policyId: string;
  requestedBy?: string;
  expiresAt?: number | null;
}): Approval {
  ensureSchema();
  const now = Date.now();
  const row: typeof approvalsTable.$inferInsert = {
    id: randomUUID(),
    agentCommandId: input.agentCommandId,
    policyId: input.policyId,
    status: "pending",
    requestedBy: input.requestedBy ?? "human",
    resolvedBy: null,
    resolvedReason: null,
    expiresAt: input.expiresAt ?? null,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(approvalsTable).values(row).run();
  const created = db
    .select()
    .from(approvalsTable)
    .where(eq(approvalsTable.id, row.id))
    .get();
  if (!created) throw new Error("failed to create approval");
  return mapApproval(created);
}

export function getApprovals(filters?: {
  status?: ApprovalStatus | "all";
  limit?: number;
}): Approval[] {
  ensureSchema();
  const conditions = [];
  if (filters?.status && filters.status !== "all") {
    conditions.push(eq(approvalsTable.status, filters.status));
  }
  const limit =
    typeof filters?.limit === "number" && Number.isFinite(filters.limit) && filters.limit > 0
      ? Math.min(filters.limit, 300)
      : 80;

  return db
    .select()
    .from(approvalsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(approvalsTable.createdAt))
    .limit(limit)
    .all()
    .map(mapApproval);
}

export function getApprovalById(id: string): Approval | null {
  ensureSchema();
  const row = db
    .select()
    .from(approvalsTable)
    .where(eq(approvalsTable.id, id))
    .get();
  return row ? mapApproval(row) : null;
}

export function getApprovalByCommandId(commandId: string): Approval | null {
  ensureSchema();
  const row = db
    .select()
    .from(approvalsTable)
    .where(eq(approvalsTable.agentCommandId, commandId))
    .get();
  return row ? mapApproval(row) : null;
}

export function resolveApproval(
  id: string,
  input: { action: "approve" | "reject"; reason?: string; resolvedBy?: string },
): Approval | null {
  ensureSchema();
  const status: ApprovalStatus = input.action === "approve" ? "approved" : "rejected";
  db.update(approvalsTable)
    .set({
      status,
      resolvedBy: input.resolvedBy ?? "human",
      resolvedReason: input.reason ?? null,
      updatedAt: Date.now(),
    })
    .where(eq(approvalsTable.id, id))
    .run();
  const row = db
    .select()
    .from(approvalsTable)
    .where(eq(approvalsTable.id, id))
    .get();
  return row ? mapApproval(row) : null;
}

export function updateApprovalTelegramMessageId(
  id: string,
  telegramMessageId: number,
): void {
  ensureSchema();
  db.update(approvalsTable)
    .set({ telegramMessageId })
    .where(eq(approvalsTable.id, id))
    .run();
}

export function getPendingExpiredApprovals(): Approval[] {
  ensureSchema();
  const now = Date.now();
  return db
    .select()
    .from(approvalsTable)
    .where(
      and(
        eq(approvalsTable.status, "pending"),
        sql`${approvalsTable.expiresAt} IS NOT NULL AND ${approvalsTable.expiresAt} <= ${now}`,
      ),
    )
    .all()
    .map(mapApproval);
}

export function getPendingApprovalCount(): number {
  ensureSchema();
  const [row] = db
    .select({ count: sql<number>`count(*)` })
    .from(approvalsTable)
    .where(eq(approvalsTable.status, "pending"))
    .all();
  return row?.count ?? 0;
}

// ── Trace / FinOps (Phase 11) ────────────────────────────────────────────────

function mapTrace(row: Record<string, unknown>): TraceEnvelope {
  return {
    id: row.id as string,
    traceId: row.traceId as string,
    ts: row.ts as number,
    agentId: row.agentId as string,
    type: row.type as TraceType,
    model: row.model as string,
    inputTokens: row.inputTokens as number,
    outputTokens: row.outputTokens as number,
    cost: row.cost as number,
    latencyMs: row.latencyMs as number,
    status: (row.status as TraceStatus) || "ok",
    metaJson: (row.metaJson as string) || "{}",
  };
}

function mapCircuitBreakerConfig(row: Record<string, unknown>): CircuitBreakerConfig {
  return {
    id: row.id as string,
    agentId: row.agentId as string,
    dailyTokenLimit: row.dailyTokenLimit as number,
    isActive: (row.isActive as number) === 1,
    updatedAt: row.updatedAt as number,
  };
}

export function appendTrace(input: {
  traceId: string;
  ts?: number;
  agentId: string;
  type: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latencyMs: number;
  status?: string;
  metaJson?: string;
}): TraceEnvelope {
  ensureSchema();
  const id = randomUUID();
  const now = Date.now();
  const row = {
    id,
    traceId: input.traceId,
    ts: input.ts ?? now,
    agentId: input.agentId,
    type: input.type,
    model: input.model,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    cost: input.cost,
    latencyMs: input.latencyMs,
    status: input.status ?? "ok",
    metaJson: input.metaJson ?? "{}",
  };
  db.insert(tracesTable).values(row).run();
  return mapTrace(row);
}

export function getTracesSince(
  since: number,
  agentId?: string,
  limit = 100,
): TraceEnvelope[] {
  ensureSchema();
  const conditions = [gt(tracesTable.ts, since)];
  if (agentId) {
    conditions.push(eq(tracesTable.agentId, agentId));
  }
  return db
    .select()
    .from(tracesTable)
    .where(and(...conditions))
    .orderBy(desc(tracesTable.ts))
    .limit(limit)
    .all()
    .map(mapTrace);
}

export function getDailyTokenUsage(
  agentId: string,
  dateStr: string,
): { inputTokens: number; outputTokens: number; cost: number; callCount: number } {
  ensureSchema();
  // dateStr: "2026-03-13" → compute start/end epoch ms
  const dayStart = new Date(dateStr + "T00:00:00+09:00").getTime();
  const dayEnd = dayStart + 86400000;
  const [row] = db
    .select({
      inputTokens: sql<number>`coalesce(sum(${tracesTable.inputTokens}), 0)`,
      outputTokens: sql<number>`coalesce(sum(${tracesTable.outputTokens}), 0)`,
      cost: sql<number>`coalesce(sum(${tracesTable.cost}), 0)`,
      callCount: sql<number>`count(*)`,
    })
    .from(tracesTable)
    .where(
      and(
        eq(tracesTable.agentId, agentId),
        gt(tracesTable.ts, dayStart),
        sql`${tracesTable.ts} <= ${dayEnd}`,
      ),
    )
    .all();
  return {
    inputTokens: row?.inputTokens ?? 0,
    outputTokens: row?.outputTokens ?? 0,
    cost: row?.cost ?? 0,
    callCount: row?.callCount ?? 0,
  };
}

export function getDailyCostSummaries(since: number): DailyCostSummary[] {
  ensureSchema();
  const sqlite = getSqlite();
  const rows = sqlite
    .prepare(
      `SELECT
        date(ts / 1000, 'unixepoch', '+9 hours') as date,
        agent_id as agentId,
        coalesce(sum(input_tokens), 0) as totalInputTokens,
        coalesce(sum(output_tokens), 0) as totalOutputTokens,
        coalesce(sum(cost), 0) as totalCost,
        count(*) as callCount
      FROM traces
      WHERE ts > ?
      GROUP BY date, agent_id
      ORDER BY date DESC, agent_id`,
    )
    .all(since) as DailyCostSummary[];
  return rows;
}

export function getCircuitBreakerConfig(agentId: string): CircuitBreakerConfig | null {
  ensureSchema();
  const [row] = db
    .select()
    .from(circuitBreakerConfigTable)
    .where(eq(circuitBreakerConfigTable.agentId, agentId))
    .all();
  return row ? mapCircuitBreakerConfig(row) : null;
}

export function getAllCircuitBreakerConfigs(): CircuitBreakerConfig[] {
  ensureSchema();
  return db
    .select()
    .from(circuitBreakerConfigTable)
    .all()
    .map(mapCircuitBreakerConfig);
}

export function upsertCircuitBreakerConfig(
  agentId: string,
  dailyTokenLimit: number,
  isActive = true,
): CircuitBreakerConfig {
  ensureSchema();
  const now = Date.now();
  const existing = getCircuitBreakerConfig(agentId);
  if (existing) {
    db.update(circuitBreakerConfigTable)
      .set({ dailyTokenLimit, isActive: isActive ? 1 : 0, updatedAt: now })
      .where(eq(circuitBreakerConfigTable.agentId, agentId))
      .run();
    return { ...existing, dailyTokenLimit, isActive, updatedAt: now };
  }
  const id = randomUUID();
  const row = {
    id,
    agentId,
    dailyTokenLimit,
    isActive: isActive ? 1 : 0,
    updatedAt: now,
  };
  db.insert(circuitBreakerConfigTable).values(row).run();
  return { id, agentId, dailyTokenLimit, isActive, updatedAt: now };
}

export function checkCircuitBreaker(agentId: string): {
  exceeded: boolean;
  usage: number;
  limit: number;
} {
  ensureSchema();
  const config = getCircuitBreakerConfig(agentId);
  if (!config || !config.isActive) {
    return { exceeded: false, usage: 0, limit: 0 };
  }
  // 오늘 KST 기준 사용량
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + kstOffset);
  const dateStr = kstNow.toISOString().slice(0, 10);
  const { inputTokens, outputTokens } = getDailyTokenUsage(agentId, dateStr);
  const totalTokens = inputTokens + outputTokens;
  return {
    exceeded: totalTokens >= config.dailyTokenLimit,
    usage: totalTokens,
    limit: config.dailyTokenLimit,
  };
}

export function getCBTriggerHistory(since: number): Array<{
  date: string;
  agentId: string;
  count: number;
  totalTokens: number;
}> {
  ensureSchema();
  const sqlite = getSqlite();
  const rows = sqlite
    .prepare(
      `SELECT
        date(ts / 1000, 'unixepoch', '+9 hours') as date,
        agent_id as agentId,
        count(*) as count,
        coalesce(sum(input_tokens + output_tokens), 0) as totalTokens
      FROM traces
      WHERE ts > ? AND status = 'circuit_broken'
      GROUP BY date, agent_id
      ORDER BY date DESC, agent_id`,
    )
    .all(since) as Array<{ date: string; agentId: string; count: number; totalTokens: number }>;
  return rows;
}

// ── WorkOrder / WorkResult (Phase 3) ──────────────────────────────────────

function mapWorkOrder(row: Record<string, unknown>): WorkOrder {
  return {
    id: row.id as string,
    type: row.type as WorkOrderType,
    summary: row.summary as string,
    fromAgentId: row.fromAgentId as string,
    toAgentId: row.toAgentId as string,
    project: (row.project as string) ?? null,
    priority: (row.priority as string as TaskPriority) ?? "medium",
    status: row.status as WorkOrderStatus,
    acceptanceCriteria: parseStringArray(row.acceptanceCriteria as string),
    inputsJson: (row.inputsJson as string) ?? "{}",
    timeoutSeconds: (row.timeoutSeconds as number) ?? 600,
    parentWorkOrderId: (row.parentWorkOrderId as string) ?? null,
    linkedTaskId: (row.linkedTaskId as string) ?? null,
    linkedCommandId: (row.linkedCommandId as string) ?? null,
    checkpointJson: (row.checkpointJson as string) ?? null,
    verifierAgentId: (row.verifierAgentId as string) ?? null,
    retryCount: (row.retryCount as number) ?? 0,
    deadline: (row.deadline as number) ?? null,
    createdAt: row.createdAt as number,
    updatedAt: row.updatedAt as number,
    completedAt: (row.completedAt as number) ?? null,
  };
}

function mapWorkResult(row: Record<string, unknown>): WorkResult {
  return {
    id: row.id as string,
    workOrderId: row.workOrderId as string,
    agentId: row.agentId as string,
    status: row.status as WorkResultStatus,
    summary: row.summary as string,
    errorDetail: (row.errorDetail as string) ?? null,
    changesJson: (row.changesJson as string) ?? "[]",
    evidenceJson: (row.evidenceJson as string) ?? "{}",
    metricsJson: (row.metricsJson as string) ?? "{}",
    followUp: parseStringArray(row.followUp as string),
    startedAt: (row.startedAt as number) ?? null,
    completedAt: row.completedAt as number,
  };
}

export function createWorkOrder(input: {
  type: string;
  summary: string;
  fromAgentId: string;
  toAgentId: string;
  project?: string | null;
  priority?: string;
  acceptanceCriteria?: string[];
  inputsJson?: string;
  timeoutSeconds?: number;
  parentWorkOrderId?: string | null;
  linkedTaskId?: string | null;
  linkedCommandId?: string | null;
  verifierAgentId?: string | null;
  deadline?: number | null;
}): WorkOrder {
  ensureSchema();
  const id = randomUUID();
  const now = Date.now();
  const row = {
    id,
    type: input.type,
    summary: input.summary,
    fromAgentId: input.fromAgentId,
    toAgentId: input.toAgentId,
    project: input.project ?? null,
    priority: input.priority ?? "medium",
    status: "pending",
    acceptanceCriteria: JSON.stringify(input.acceptanceCriteria ?? []),
    inputsJson: input.inputsJson ?? "{}",
    timeoutSeconds: input.timeoutSeconds ?? 600,
    parentWorkOrderId: input.parentWorkOrderId ?? null,
    linkedTaskId: input.linkedTaskId ?? null,
    linkedCommandId: input.linkedCommandId ?? null,
    checkpointJson: null,
    verifierAgentId: input.verifierAgentId ?? null,
    retryCount: 0,
    deadline: input.deadline ?? null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
  db.insert(workOrdersTable).values(row).run();
  return mapWorkOrder(row);
}

export function getWorkOrder(id: string): WorkOrder | null {
  ensureSchema();
  const row = db.select().from(workOrdersTable).where(eq(workOrdersTable.id, id)).get();
  return row ? mapWorkOrder(row) : null;
}

export function listWorkOrders(opts?: {
  status?: string;
  toAgentId?: string;
  fromAgentId?: string;
  project?: string;
  limit?: number;
}): WorkOrder[] {
  ensureSchema();
  const conditions = [];
  if (opts?.status) conditions.push(eq(workOrdersTable.status, opts.status));
  if (opts?.toAgentId) conditions.push(eq(workOrdersTable.toAgentId, opts.toAgentId));
  if (opts?.fromAgentId) conditions.push(eq(workOrdersTable.fromAgentId, opts.fromAgentId));
  if (opts?.project) conditions.push(eq(workOrdersTable.project, opts.project));

  const query = db
    .select()
    .from(workOrdersTable)
    .orderBy(desc(workOrdersTable.updatedAt))
    .limit(opts?.limit ?? 100);

  if (conditions.length > 0) {
    return query.where(and(...conditions)).all().map(mapWorkOrder);
  }
  return query.all().map(mapWorkOrder);
}

export function updateWorkOrder(
  id: string,
  updates: {
    status?: string;
    toAgentId?: string;
    priority?: string;
    acceptanceCriteria?: string[];
    checkpointJson?: string | null;
    verifierAgentId?: string | null;
    deadline?: number | null;
    linkedCommandId?: string | null;
    retryCount?: number;
    completedAt?: number | null;
  },
): WorkOrder | null {
  ensureSchema();
  const now = Date.now();
  const sets: Record<string, unknown> = { updatedAt: now };
  if (updates.status !== undefined) sets.status = updates.status;
  if (updates.toAgentId !== undefined) sets.toAgentId = updates.toAgentId;
  if (updates.priority !== undefined) sets.priority = updates.priority;
  if (updates.acceptanceCriteria !== undefined)
    sets.acceptanceCriteria = JSON.stringify(updates.acceptanceCriteria);
  if (updates.checkpointJson !== undefined) sets.checkpointJson = updates.checkpointJson;
  if (updates.verifierAgentId !== undefined) sets.verifierAgentId = updates.verifierAgentId;
  if (updates.deadline !== undefined) sets.deadline = updates.deadline;
  if (updates.linkedCommandId !== undefined) sets.linkedCommandId = updates.linkedCommandId;
  if (updates.retryCount !== undefined) sets.retryCount = updates.retryCount;
  if (updates.completedAt !== undefined) sets.completedAt = updates.completedAt;

  db.update(workOrdersTable).set(sets).where(eq(workOrdersTable.id, id)).run();
  return getWorkOrder(id);
}

export function createWorkResult(input: {
  workOrderId: string;
  agentId: string;
  status: string;
  summary: string;
  errorDetail?: string | null;
  changesJson?: string;
  evidenceJson?: string;
  metricsJson?: string;
  followUp?: string[];
  startedAt?: number | null;
}): WorkResult {
  ensureSchema();
  const id = randomUUID();
  const now = Date.now();
  const row = {
    id,
    workOrderId: input.workOrderId,
    agentId: input.agentId,
    status: input.status,
    summary: input.summary,
    errorDetail: input.errorDetail ?? null,
    changesJson: input.changesJson ?? "[]",
    evidenceJson: input.evidenceJson ?? "{}",
    metricsJson: input.metricsJson ?? "{}",
    followUp: JSON.stringify(input.followUp ?? []),
    startedAt: input.startedAt ?? null,
    completedAt: now,
  };
  db.insert(workResultsTable).values(row).run();
  return mapWorkResult(row);
}

export function getWorkResultsByOrderId(workOrderId: string): WorkResult[] {
  ensureSchema();
  return db
    .select()
    .from(workResultsTable)
    .where(eq(workResultsTable.workOrderId, workOrderId))
    .orderBy(desc(workResultsTable.completedAt))
    .all()
    .map(mapWorkResult);
}

export function saveWorkOrderCheckpoint(id: string, checkpointJson: string): WorkOrder | null {
  return updateWorkOrder(id, { checkpointJson });
}

export function getTaskActivity(taskId: string): {
  events: EventItem[];
  workOrders: WorkOrder[];
} {
  ensureSchema();
  const events = db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.taskId, taskId))
    .orderBy(eventsTable.ts)
    .all()
    .map(mapEvent);

  const workOrders = db
    .select()
    .from(workOrdersTable)
    .where(eq(workOrdersTable.linkedTaskId, taskId))
    .orderBy(workOrdersTable.createdAt)
    .all()
    .map(mapWorkOrder);

  return { events, workOrders };
}

export function getWorkOrderStats(): {
  total: number;
  byStatus: Record<string, number>;
  byAgent: Record<string, number>;
} {
  ensureSchema();
  const sqlite = getSqlite();
  const statusRows = sqlite
    .prepare("SELECT status, COUNT(*) as cnt FROM work_orders GROUP BY status")
    .all() as Array<{ status: string; cnt: number }>;
  const agentRows = sqlite
    .prepare("SELECT to_agent_id as agent, COUNT(*) as cnt FROM work_orders GROUP BY to_agent_id")
    .all() as Array<{ agent: string; cnt: number }>;

  const byStatus: Record<string, number> = {};
  let total = 0;
  for (const row of statusRows) {
    byStatus[row.status] = row.cnt;
    total += row.cnt;
  }
  const byAgent: Record<string, number> = {};
  for (const row of agentRows) {
    byAgent[row.agent] = row.cnt;
  }
  return { total, byStatus, byAgent };
}
