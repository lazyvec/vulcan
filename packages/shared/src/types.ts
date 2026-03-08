export type AgentStatus =
  | "idle"
  | "writing"
  | "researching"
  | "executing"
  | "syncing"
  | "error";

export type TaskLane =
  | "backlog"
  | "queued"
  | "in_progress"
  | "review"
  | "done"
  | "archived";

export type TaskPriority = "low" | "medium" | "high" | "critical";

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
  description: string | null;
  assigneeAgentId: string | null;
  lane: TaskLane;
  priority: TaskPriority;
  dueAt: number | null;
  tags: string[];
  parentTaskId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface TaskComment {
  id: string;
  taskId: string;
  author: string;
  content: string;
  createdAt: number;
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  createdAt: number;
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

// ── Obsidian Vault ──────────────────────────────────────────────────────────

export interface VaultNote {
  path: string;
  title: string;
  frontmatter: Record<string, unknown>;
  content: string;
  modified: string;
}

export interface VaultNoteSummary {
  path: string;
  title: string;
  frontmatter: Record<string, unknown>;
  modified: string;
}

export interface ClipResult {
  title: string;
  author: string;
  published: string;
  description: string;
  url: string;
  savedPath: string;
}

// ── Activity Stats ──────────────────────────────────────────────────────────

export interface ActivityStats {
  totalEvents: number;
  byType: Record<string, number>;
  byAgent: Record<string, number>;
  byHour: Array<{ hour: string; count: number }>;
  errorCount: number;
}

// ── Skills Marketplace ──────────────────────────────────────────────────────

export type SkillCategory =
  | "coding"
  | "research"
  | "writing"
  | "data"
  | "communication"
  | "automation"
  | "other";

export interface Skill {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: SkillCategory;
  iconKey: string;
  tags: string[];
  isBuiltin: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AgentSkill {
  id: string;
  agentId: string;
  skillId: string;
  skillName: string;
  installedAt: number;
  syncedAt: number;
}

export interface SkillRegistryEntry {
  id: string;
  name: string;
  discoveredFrom: string;
  firstSeenAt: number;
  lastSeenAt: number;
}

// ── Notification (Phase 7) ──────────────────────────────────────────────────

export type NotificationCategory =
  | "agent"
  | "task"
  | "command"
  | "skill"
  | "system"
  | "gateway"
  | "legacy";

export interface NotificationPreference {
  id: string;
  userId: string;
  chatId: string;
  enabledCategories: NotificationCategory[];
  enabledTypes: string[];
  silentHours: { startHour: number; endHour: number } | null;
  createdAt: number;
  updatedAt: number;
}

export interface NotificationLog {
  id: string;
  chatId: string;
  eventType: string;
  message: string;
  status: "sent" | "failed";
  error: string | null;
  sentAt: number;
}
