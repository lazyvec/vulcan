"use client";

import { useCallback, useMemo, useState } from "react";
import { LiveActivityPanel } from "@/components/LiveActivityPanel";
import { ZoneBoard } from "@/components/office/ZoneBoard";
import { AgentDetailCard } from "@/components/office/AgentDetailCard";
import { CommandHistory } from "@/components/office/CommandHistory";
import { StatusDot } from "@/components/ui/StatusDot";
import { STATUS_LABELS, statusFromEventType } from "@/lib/statusMap";
import type { Agent, AgentStatus, EventItem } from "@/lib/types";

const STATUS_SEQUENCE: AgentStatus[] = ["idle", "writing", "researching", "executing", "syncing", "error"];

interface OfficeViewProps {
  agents: Agent[];
  initialEvents: EventItem[];
}

export function OfficeView({ agents, initialEvents }: OfficeViewProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agents[0]?.id ?? "hermes");
  const [liveAgents, setLiveAgents] = useState<Agent[]>(agents);

  const selectedAgent = useMemo(
    () => liveAgents.find((a) => a.id === selectedAgentId) ?? null,
    [liveAgents, selectedAgentId],
  );

  const agentsByStatus = useMemo(
    () => STATUS_SEQUENCE.map((status) => ({
      status,
      agents: liveAgents.filter((a) => a.status === status),
    })),
    [liveAgents],
  );

  const handleIncomingEvent = useCallback((event: EventItem) => {
    if (!event.agentId) return;
    const status = statusFromEventType(event.type);
    setLiveAgents((prev) =>
      prev.map((a) =>
        a.id === event.agentId
          ? { ...a, status, statusSince: event.ts, lastSeenAt: event.ts }
          : a,
      ),
    );
  }, []);

  return (
    <div className="grid gap-4 2xl:grid-cols-[1.8fr_1fr]">
      <section className="vulcan-card p-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="mr-auto page-title">오피스 플로어</h2>
          <span className="vulcan-chip text-xs">에이전트 {liveAgents.length}</span>
          <span className="vulcan-chip text-xs">선택됨 {selectedAgent?.name ?? "없음"}</span>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
          <div className="space-y-3">
            <ZoneBoard
              agentsByStatus={agentsByStatus}
              selectedAgentId={selectedAgentId}
              onSelectAgent={setSelectedAgentId}
            />

            {/* Agent Roster */}
            <article className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]/70 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-tertiary)]">에이전트 명단</p>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {liveAgents.map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => setSelectedAgentId(agent.id)}
                    className={`rounded border p-2.5 text-left transition-colors ${
                      selectedAgentId === agent.id
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-bg)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]"
                    }`}
                  >
                    <p className="text-sm font-semibold text-[var(--color-foreground)]">{agent.name}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <StatusDot status={agent.status} size="sm" />
                      <span className="text-xs text-[var(--color-muted-foreground)]">{STATUS_LABELS[agent.status]}</span>
                    </div>
                  </button>
                ))}
              </div>
            </article>
          </div>

          <aside className="space-y-3">
            <AgentDetailCard agent={selectedAgent} />
            <CommandHistory agentId={selectedAgentId} />
          </aside>
        </div>
      </section>

      <LiveActivityPanel
        initialEvents={initialEvents}
        title="오피스 라이브 피드"
        onEvent={handleIncomingEvent}
      />
    </div>
  );
}
