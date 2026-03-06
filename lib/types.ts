export type AgentStatus =
  | "idle"
  | "writing"
  | "researching"
  | "executing"
  | "syncing"
  | "error";

export type TaskLane = "backlog" | "in_progress" | "review";

export interface Agent {
  id: string;
  name: string;
  roleTags: string[];
  mission: string;
  avatarKey: string;
  status: AgentStatus;
  statusSince: number;
  lastSeenAt: number;
}

export interface Project {
  id: string;
  name: string;
  status: string;
  progress: number;
  priority: string;
  ownerAgentId: string | null;
  updatedAt: number;
}

export interface Task {
  id: string;
  projectId: string | null;
  title: string;
  assigneeAgentId: string | null;
  lane: TaskLane;
  createdAt: number;
  updatedAt: number;
}

export interface EventItem {
  id: string;
  ts: number;
  source: string;
  agentId: string | null;
  projectId: string | null;
  taskId: string | null;
  type: string;
  summary: string;
  payloadJson: string;
}

export interface MemoryItem {
  id: string;
  container: "journal" | "longterm";
  title: string;
  content: string;
  tags: string[];
  sourceRef: string | null;
  createdAt: number;
}

export interface DocItem {
  id: string;
  title: string;
  tags: string[];
  format: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface Schedule {
  id: string;
  name: string;
  cronOrInterval: string;
  status: "scheduled" | "running";
  lastRunAt: number | null;
  nextRunAt: number | null;
  ownerAgentId: string | null;
}

export interface IngestEventInput {
  id?: string;
  ts?: number;
  source?: string;
  agentId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  type: string;
  summary: string;
  payloadJson?: string;
}
