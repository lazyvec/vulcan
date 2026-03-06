import type {
  Agent,
  DocItem,
  EventItem,
  IngestEventInput,
  MemoryItem,
  Project,
  Schedule,
  Task,
  TaskLane,
} from "@vulcan/shared/types";

export interface Store {
  getAgents(): Agent[];
  getProjects(): Project[];
  getTasks(filters?: { lane?: TaskLane | "all"; q?: string }): Task[];
  updateTaskLane(id: string, lane: TaskLane): Task | null;
  getLatestEvents(limit?: number): EventItem[];
  getEventsSince(ts: number): EventItem[];
  appendEvent(input: IngestEventInput): EventItem;
  getMemoryItems(container?: "journal" | "longterm"): MemoryItem[];
  getDocs(query?: string): DocItem[];
  getSchedules(): Schedule[];
  countRecords(): {
    agents: number;
    projects: number;
    tasks: number;
    events: number;
  };
}
