import type {
  ActivityStats,
  Agent,
  AgentSkill,
  Approval,
  ApprovalPolicy,
  AuditLogItem,
  DocItem,
  EventItem,
  MemoryItem,
  NotificationLog,
  NotificationPreference,
  Project,
  Schedule,
  Skill,
  SkillRegistryEntry,
  Task,
  TaskLane,
  TaskPriority,
  VaultNoteSummary,
} from "@vulcan/shared/types";

const API_BASE_URL = process.env.VULCAN_API_BASE_URL ?? "http://127.0.0.1:8787";

async function requestJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${path}`);
  }

  return (await response.json()) as T;
}

export async function getAgents(options?: { includeInactive?: boolean }) {
  const params = new URLSearchParams();
  if (options?.includeInactive) {
    params.set("includeInactive", "1");
  }
  const suffix = params.toString();
  const data = await requestJson<{ agents: Agent[] }>(
    suffix ? `/api/agents?${suffix}` : "/api/agents",
  );
  return data.agents;
}

export async function getProjects() {
  const data = await requestJson<{ projects: Project[] }>("/api/projects");
  return data.projects;
}

export async function getTasks(filters?: {
  lane?: TaskLane | "all";
  q?: string;
  projectId?: string;
  assigneeAgentId?: string;
  priority?: TaskPriority;
}) {
  const params = new URLSearchParams();
  if (filters?.lane) params.set("lane", filters.lane);
  if (filters?.q) params.set("q", filters.q);
  if (filters?.projectId) params.set("projectId", filters.projectId);
  if (filters?.assigneeAgentId) params.set("assigneeAgentId", filters.assigneeAgentId);
  if (filters?.priority) params.set("priority", filters.priority);

  const query = params.toString();
  const data = await requestJson<{ tasks: Task[] }>(
    query ? `/api/tasks?${query}` : "/api/tasks",
  );
  return data.tasks;
}

export async function getLatestEvents(limit = 80) {
  const events = await requestJson<{ events: EventItem[] }>("/api/events");
  return events.events.slice(-limit);
}

export async function getMemoryItems(container?: "journal" | "longterm" | "profile" | "lesson") {
  const query = container ? `?container=${container}` : "";
  const data = await requestJson<{ memory: MemoryItem[] }>(`/api/memory${query}`);
  return data.memory;
}

export async function getDocs(query?: string) {
  const params = new URLSearchParams();
  if (query?.trim()) {
    params.set("q", query.trim());
  }
  const suffix = params.toString();
  const data = await requestJson<{ docs: DocItem[] }>(suffix ? `/api/docs?${suffix}` : "/api/docs");
  return data.docs;
}

export async function getSchedules() {
  const data = await requestJson<{ schedules: Schedule[] }>("/api/schedule");
  return data.schedules;
}

export async function getVaultNotes(): Promise<VaultNoteSummary[]> {
  const data = await requestJson<{ notes: VaultNoteSummary[] }>("/api/vault/notes");
  return data.notes;
}

export async function getSkills(filters?: { category?: string; q?: string }) {
  const params = new URLSearchParams();
  if (filters?.category) params.set("category", filters.category);
  if (filters?.q) params.set("q", filters.q);
  const suffix = params.toString();
  const data = await requestJson<{ skills: Skill[] }>(
    suffix ? `/api/skills?${suffix}` : "/api/skills",
  );
  return data.skills;
}

export async function getAgentSkills(agentId: string) {
  const data = await requestJson<{ skills: AgentSkill[] }>(`/api/agents/${agentId}/skills`);
  return data.skills;
}

export async function getSkillRegistry() {
  const data = await requestJson<{ registry: SkillRegistryEntry[] }>("/api/skill-registry");
  return data.registry;
}

export async function getActivityEvents(filters?: {
  type?: string;
  agentId?: string;
  source?: string;
  since?: number;
  until?: number;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.type) params.set("type", filters.type);
  if (filters?.agentId) params.set("agentId", filters.agentId);
  if (filters?.source) params.set("source", filters.source);
  if (filters?.since) params.set("since", String(filters.since));
  if (filters?.until) params.set("until", String(filters.until));
  if (filters?.limit) params.set("limit", String(filters.limit));
  if (filters?.offset) params.set("offset", String(filters.offset));
  const suffix = params.toString();
  const data = await requestJson<{ events: EventItem[]; total: number }>(
    suffix ? `/api/activity?${suffix}` : "/api/activity",
  );
  return data;
}

export async function getActivityStats(since?: number) {
  const params = new URLSearchParams();
  if (since) params.set("since", String(since));
  const suffix = params.toString();
  const data = await requestJson<{ stats: ActivityStats }>(
    suffix ? `/api/activity/stats?${suffix}` : "/api/activity/stats",
  );
  return data.stats;
}

export async function getNotificationPreferences() {
  const data = await requestJson<{ preferences: NotificationPreference | null }>(
    "/api/notifications/preferences",
  );
  return data.preferences;
}

export async function getNotificationLogs(limit = 50) {
  const data = await requestJson<{ logs: NotificationLog[] }>(
    `/api/notifications/logs?limit=${limit}`,
  );
  return data.logs;
}

// ── Approval / Governance (Phase 8) ──────────────────────────────────────────

export async function getApprovalPolicies() {
  const data = await requestJson<{ policies: ApprovalPolicy[] }>("/api/approval-policies");
  return data.policies;
}

export async function getApprovals(filters?: { status?: string; limit?: number }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.limit) params.set("limit", String(filters.limit));
  const suffix = params.toString();
  const data = await requestJson<{ approvals: Approval[] }>(
    suffix ? `/api/approvals?${suffix}` : "/api/approvals",
  );
  return data.approvals;
}

export async function getPendingApprovalCount() {
  const data = await requestJson<{ count: number }>("/api/approvals/pending-count");
  return data.count;
}

export async function getAuditLogs(filters?: {
  action?: string;
  entityType?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.action) params.set("action", filters.action);
  if (filters?.entityType) params.set("entityType", filters.entityType);
  if (filters?.limit) params.set("limit", String(filters.limit));
  if (filters?.offset) params.set("offset", String(filters.offset));
  const suffix = params.toString();
  const data = await requestJson<{ logs: AuditLogItem[]; total: number }>(
    suffix ? `/api/audit?${suffix}` : "/api/audit",
  );
  return data;
}
