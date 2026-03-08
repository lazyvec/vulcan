import type { AgentStatus } from "./types";

// ── Event Type System ───────────────────────────────────────────────────────

export const EVENT_TYPES = [
  "agent.create", "agent.update", "agent.deactivate", "agent.pause", "agent.resume",
  "task.create", "task.update", "task.move", "task.delete", "task.comment",
  "command.queued", "command.sent", "command.failed", "command.retry",
  "skill.install", "skill.remove", "skill.sync",
  "system.error", "system.sync", "system.health",
  "gateway.connected", "gateway.disconnected",
  "message", "tool", "exec", "research", "search", "ping", "sync", "error",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_CATEGORIES: Record<string, readonly string[]> = {
  agent: ["agent.create", "agent.update", "agent.deactivate", "agent.pause", "agent.resume"],
  task: ["task.create", "task.update", "task.move", "task.delete", "task.comment"],
  command: ["command.queued", "command.sent", "command.failed", "command.retry"],
  skill: ["skill.install", "skill.remove", "skill.sync"],
  system: ["system.error", "system.sync", "system.health"],
  gateway: ["gateway.connected", "gateway.disconnected"],
  legacy: ["message", "tool", "exec", "research", "search", "ping", "sync", "error"],
} as const;

export const EVENT_CATEGORY_LABELS: Record<string, string> = {
  agent: "에이전트",
  task: "태스크",
  command: "커맨드",
  skill: "스킬",
  system: "시스템",
  gateway: "게이트웨이",
  legacy: "레거시",
};

export const EVENT_TYPE_ICONS: Record<string, string> = {
  "agent.create": "UserPlus",
  "agent.update": "UserCog",
  "agent.deactivate": "UserMinus",
  "agent.pause": "Pause",
  "agent.resume": "Play",
  "task.create": "ListPlus",
  "task.update": "ListChecks",
  "task.move": "ArrowRightLeft",
  "task.delete": "ListX",
  "task.comment": "MessageCircle",
  "command.queued": "Clock",
  "command.sent": "Send",
  "command.failed": "XCircle",
  "command.retry": "RotateCcw",
  "skill.install": "Download",
  "skill.remove": "Trash2",
  "skill.sync": "RefreshCw",
  "system.error": "AlertTriangle",
  "system.sync": "RefreshCw",
  "system.health": "HeartPulse",
  "gateway.connected": "Plug",
  "gateway.disconnected": "Unplug",
  message: "MessageSquare",
  tool: "TerminalSquare",
  exec: "TerminalSquare",
  research: "Search",
  search: "Search",
  ping: "Radio",
  sync: "RefreshCw",
  error: "AlertTriangle",
};

export function eventCategoryOf(type: string): string {
  for (const [cat, types] of Object.entries(EVENT_CATEGORIES)) {
    if ((types as readonly string[]).includes(type)) return cat;
  }
  return "legacy";
}

// ── Agent Status ────────────────────────────────────────────────────────────

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
