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
  skills?: string[];
  config?: Record<string, unknown>;
  isActive?: boolean;
  gatewayId?: string | null;
  capabilities?: string[];
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

export interface GatewayInfo {
  id: string;
  name: string;
  url: string;
  protocol: string;
  status: string;
  lastSeenAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export type AgentCommandMode = "delegate" | "direct";
export type AgentCommandStatus = "queued" | "sent" | "failed";

export interface AgentCommand {
  id: string;
  agentId: string;
  mode: AgentCommandMode;
  command: string;
  payloadJson: string;
  status: AgentCommandStatus;
  gatewayCommandId: string | null;
  error: string | null;
  requestedBy: string;
  createdAt: number;
  updatedAt: number;
  executedAt: number | null;
}

export interface AuditLogItem {
  id: string;
  ts: number;
  actor: string;
  action: string;
  entityType: string;
  entityId: string | null;
  source: string;
  beforeJson: string;
  afterJson: string;
  metadataJson: string;
}

export type RealtimeMessageType = "event" | "command" | "ack" | "error";

export interface RealtimeEnvelope<
  TType extends RealtimeMessageType,
  TPayload = unknown,
> {
  type: TType;
  payload: TPayload;
}

export type RealtimeClientCommandMessage = RealtimeEnvelope<
  "command",
  {
    command: "ping";
    requestId?: string;
  }
>;

export type RealtimeServerEventMessage = RealtimeEnvelope<"event", EventItem>;

export type RealtimeServerAckMessage = RealtimeEnvelope<
  "ack",
  {
    kind: "ready" | "heartbeat" | "pong";
    ts: number;
    requestId?: string;
  }
>;

export type RealtimeServerErrorMessage = RealtimeEnvelope<
  "error",
  {
    message: string;
    requestId?: string;
  }
>;

export type RealtimeClientMessage = RealtimeClientCommandMessage;

export type RealtimeServerMessage =
  | RealtimeServerEventMessage
  | RealtimeServerAckMessage
  | RealtimeServerErrorMessage;
