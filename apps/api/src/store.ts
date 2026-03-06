import { randomUUID } from "node:crypto";
import { and, desc, eq, gt, like, or, sql } from "drizzle-orm";
import { statusFromEventType } from "@vulcan/shared/constants";
import type {
  Agent,
  AgentStatus,
  DocItem,
  EventItem,
  IngestEventInput,
  MemoryItem,
  Project,
  Schedule,
  Task,
  TaskLane,
} from "@vulcan/shared/types";
import { db, ensureSchema } from "./db";
import {
  agentsTable,
  docsTable,
  eventsTable,
  memoryItemsTable,
  projectsTable,
  schedulesTable,
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
    assigneeAgentId: row.assigneeAgentId,
    lane: row.lane as TaskLane,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
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

export function getAgents(): Agent[] {
  ensureSchema();
  return db.select().from(agentsTable).orderBy(agentsTable.name).all().map(mapAgent);
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

export function getTasks(filters?: { lane?: TaskLane | "all"; q?: string }): Task[] {
  ensureSchema();
  const conditions = [];

  if (filters?.lane && filters.lane !== "all") {
    conditions.push(eq(tasksTable.lane, filters.lane));
  }

  if (filters?.q?.trim()) {
    const query = `%${filters.q.trim()}%`;
    conditions.push(
      or(
        like(tasksTable.title, query),
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

export function countRecords() {
  ensureSchema();

  const [agentsCount] = db.select({ count: sql<number>`count(*)` }).from(agentsTable).all();
  const [projectsCount] = db
    .select({ count: sql<number>`count(*)` })
    .from(projectsTable)
    .all();
  const [tasksCount] = db.select({ count: sql<number>`count(*)` }).from(tasksTable).all();
  const [eventsCount] = db.select({ count: sql<number>`count(*)` }).from(eventsTable).all();

  return {
    agents: agentsCount?.count ?? 0,
    projects: projectsCount?.count ?? 0,
    tasks: tasksCount?.count ?? 0,
    events: eventsCount?.count ?? 0,
  };
}
