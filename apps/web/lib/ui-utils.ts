import type { AgentStatus } from "@/lib/types";
import type { BadgeStatus } from "./ui-types";

// ── Agent Status → Badge Status 매핑 ──
export const statusBadgeMap: Record<AgentStatus, BadgeStatus> = {
  idle: "neutral",
  writing: "info",
  researching: "warning",
  executing: "info",
  syncing: "success",
  error: "error",
};

// ── Event Category → Badge Status 매핑 ──
export const eventCategoryColorMap: Record<string, BadgeStatus> = {
  agent: "success",
  task: "info",
  command: "warning",
  skill: "info",
  system: "error",
  gateway: "info",
  legacy: "neutral",
};

// ── Kanban Lane → 색상 매핑 ──
export const laneColorMap: Record<string, { icon: string; badge: BadgeStatus }> = {
  backlog: { icon: "text-[var(--color-tertiary)]", badge: "neutral" },
  queued: { icon: "text-[var(--color-tertiary)]", badge: "neutral" },
  in_progress: { icon: "text-[var(--color-primary)]", badge: "warning" },
  review: { icon: "text-[var(--color-info)]", badge: "info" },
  done: { icon: "text-[var(--color-success)]", badge: "success" },
  archived: { icon: "text-[var(--color-tertiary)]", badge: "neutral" },
};

// ── Approval Status → Badge Status 매핑 ──
export const approvalStatusColorMap: Record<string, BadgeStatus> = {
  pending: "warning",
  approved: "success",
  rejected: "error",
  expired: "neutral",
};

// ── Command Status → Badge Status 매핑 ──
export const commandStatusColorMap: Record<string, BadgeStatus> = {
  queued: "warning",
  sent: "success",
  failed: "error",
  pending_approval: "info",
};
