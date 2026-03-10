"use client";

import { OFFICE_ZONES, STATUS_LABELS } from "@/lib/statusMap";
import { StatusDot } from "@/components/ui/StatusDot";
import type { Agent, AgentStatus } from "@/lib/types";

interface ZoneBoardProps {
  agentsByStatus: Array<{ status: AgentStatus; agents: Agent[] }>;
  selectedAgentId: string;
  onSelectAgent: (id: string) => void;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ZoneBoard({ agentsByStatus, selectedAgentId, onSelectAgent }: ZoneBoardProps) {
  return (
    <article className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]/70 p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-tertiary)]">구역 보드</p>
        <p className="caption-text">상태 → 사무실 구역 매핑</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {agentsByStatus.map((zone) => (
          <article key={zone.status} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <StatusDot status={zone.status} />
                <p className="text-xs font-semibold text-[var(--color-foreground)]">{STATUS_LABELS[zone.status]}</p>
              </div>
              <span className="caption-text">{zone.agents.length}</span>
            </div>
            <p className="mb-2 text-[11px] text-[var(--color-tertiary)]">{OFFICE_ZONES[zone.status]}</p>
            <div className="space-y-1.5">
              {zone.agents.length > 0 ? (
                zone.agents.map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => onSelectAgent(agent.id)}
                    className={`flex w-full items-center justify-between rounded border px-2 py-1 text-left text-xs transition-colors ${
                      selectedAgentId === agent.id
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-12)]"
                        : "border-[var(--color-border)] bg-[var(--color-background)] hover:bg-[var(--color-surface-hover)]"
                    }`}
                  >
                    <span className="truncate text-[var(--color-foreground)]">{agent.name}</span>
                    <span className="caption-text">{formatTime(agent.lastSeenAt)}</span>
                  </button>
                ))
              ) : (
                <p className="text-[11px] text-[var(--color-tertiary)]">이 구역에 에이전트 없음</p>
              )}
            </div>
          </article>
        ))}
      </div>
    </article>
  );
}
