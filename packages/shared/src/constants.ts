import type { AgentStatus } from "./types";

export const STATUS_LABELS: Record<AgentStatus, string> = {
  idle: "Idle",
  writing: "Writing",
  researching: "Researching",
  executing: "Executing",
  syncing: "Syncing",
  error: "Error",
};

export const STATUS_COLORS: Record<AgentStatus, string> = {
  idle: "var(--color-muted-foreground)",
  writing: "var(--color-info)",
  researching: "var(--color-warning)",
  executing: "var(--color-primary)",
  syncing: "var(--color-success)",
  error: "var(--color-destructive)",
};

export const OFFICE_ZONES: Record<AgentStatus, string> = {
  idle: "Watercooler",
  writing: "Desk",
  researching: "Library",
  executing: "Workbench",
  syncing: "Hallway",
  error: "Red Corner",
};

export const OFFICE_ZONE_POSITION: Record<
  AgentStatus,
  { left: number; top: number; title: string }
> = {
  idle: { left: 12, top: 68, title: "Watercooler" },
  writing: { left: 44, top: 66, title: "Desk" },
  researching: { left: 68, top: 22, title: "Library" },
  executing: { left: 70, top: 62, title: "Workbench" },
  syncing: { left: 38, top: 36, title: "Hallway" },
  error: { left: 10, top: 18, title: "Red Corner" },
};

export function statusFromEventType(type: string): AgentStatus {
  const eventType = type.toLowerCase();
  if (eventType.includes("error")) {
    return "error";
  }
  if (eventType.includes("tool") || eventType.includes("exec")) {
    return "executing";
  }
  if (eventType.includes("sync")) {
    return "syncing";
  }
  if (eventType.includes("message") || eventType.includes("ping")) {
    return "writing";
  }
  if (eventType.includes("research") || eventType.includes("search")) {
    return "researching";
  }
  return "idle";
}
