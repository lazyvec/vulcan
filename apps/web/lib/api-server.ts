import type {
  Agent,
  DocItem,
  EventItem,
  MemoryItem,
  Project,
  Schedule,
  Task,
  TaskLane,
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

export async function getAgents() {
  const data = await requestJson<{ agents: Agent[] }>("/api/agents");
  return data.agents;
}

export async function getProjects() {
  const data = await requestJson<{ projects: Project[] }>("/api/projects");
  return data.projects;
}

export async function getTasks(filters?: { lane?: TaskLane | "all"; q?: string }) {
  const params = new URLSearchParams();
  if (filters?.lane) {
    params.set("lane", filters.lane);
  }
  if (filters?.q) {
    params.set("q", filters.q);
  }

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

export async function getMemoryItems(container?: "journal" | "longterm") {
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
