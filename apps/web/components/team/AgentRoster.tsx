"use client";

import { OFFICE_ZONES, STATUS_LABELS } from "@/lib/statusMap";
import { Badge } from "@/components/ui/Badge";
import { statusBadgeMap } from "@/lib/ui-utils";
import type { Agent, AgentStatus } from "@/lib/types";

interface AgentRosterProps {
  agents: Agent[];
  selectedAgentId: string;
  onSelectAgent: (id: string) => void;
  statusOrder: AgentStatus[];
}

function isPaused(agent: Agent) {
  const config = agent.config as Record<string, unknown> | null;
  return config?.paused === true;
}

export function AgentRoster({ agents, selectedAgentId, onSelectAgent, statusOrder }: AgentRosterProps) {
  const activeAgents = agents.filter((a) => a.isActive !== false);
  const inactiveAgents = agents.filter((a) => a.isActive === false);

  const groupedActive = statusOrder
    .map((status) => ({
      status,
      agents: activeAgents.filter((a) => a.status === status),
    }))
    .filter((section) => section.agents.length > 0);

  return (
    <section className="space-y-3">
      {/* Summary chips */}
      <article className="vulcan-card p-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge status="neutral">전체 {agents.length}</Badge>
          <Badge status="success" dot>활성 {activeAgents.length}</Badge>
          <Badge status="neutral">비활성 {inactiveAgents.length}</Badge>
        </div>
      </article>

      {/* Active agents by status */}
      {groupedActive.map((section) => (
        <article key={section.status} className="vulcan-card p-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="section-title">{STATUS_LABELS[section.status]}</h3>
            <span className="caption-text">
              {OFFICE_ZONES[section.status]} · {section.agents.length}
            </span>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {section.agents.map((agent) => {
              const selected = agent.id === selectedAgentId;
              const paused = isPaused(agent);
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => onSelectAgent(agent.id)}
                  className={`min-h-[44px] rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                    selected
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-bg)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--color-foreground)]">{agent.name}</p>
                    <Badge status={statusBadgeMap[agent.status]} dot>
                      {STATUS_LABELS[agent.status]}
                    </Badge>
                  </div>
                  <p className="line-clamp-2 text-xs text-[var(--color-muted-foreground)]">{agent.mission}</p>
                  <p className="mt-1 caption-text">구역: {OFFICE_ZONES[agent.status]}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {paused && <Badge status="warning">일시정지됨</Badge>}
                    {agent.roleTags.map((tag) => (
                      <span key={tag} className="vulcan-chip text-[11px]">{tag}</span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </article>
      ))}

      {/* Inactive agents */}
      {inactiveAgents.length > 0 && (
        <article className="vulcan-card p-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="section-title">비활성 에이전트</h3>
            <span className="caption-text">{inactiveAgents.length}</span>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {inactiveAgents.map((agent) => {
              const selected = agent.id === selectedAgentId;
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => onSelectAgent(agent.id)}
                  className={`min-h-[44px] rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                    selected
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-bg)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--color-foreground)]">{agent.name}</p>
                    <Badge status="warning">비활성</Badge>
                  </div>
                  <p className="line-clamp-2 text-xs text-[var(--color-muted-foreground)]">{agent.mission}</p>
                  <p className="mt-1 caption-text">마지막 상태: {STATUS_LABELS[agent.status]}</p>
                </button>
              );
            })}
          </div>
        </article>
      )}
    </section>
  );
}
