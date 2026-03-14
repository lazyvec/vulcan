"use client";

import { useCallback, useMemo, useState } from "react";
import { OFFICE_ZONES, STATUS_COLORS, STATUS_LABELS } from "@/lib/statusMap";
import { useAgentStatus } from "@/hooks/useAgentStatus";
import type { Agent, AgentStatus, WorkOrder } from "@/lib/types";
import { Wifi, WifiOff, X } from "lucide-react";

const STATUS_SEQUENCE: AgentStatus[] = ["researching", "executing", "writing", "syncing", "idle", "error"];

const ZONE_ICONS: Record<string, string> = {
  Library: "📚",
  "Red Corner": "🔴",
  Hallway: "🚶",
  Watercooler: "☕",
  Desk: "✍️",
  Workbench: "🔧",
};

interface AgentOfficeViewProps {
  initialAgents: Agent[];
  agentWorkOrders: Record<string, WorkOrder | null>;
  agentTokenUsage: Record<string, number>;
}

function getAnimationClass(status: AgentStatus): string {
  switch (status) {
    case "writing":
    case "researching":
      return "agent-pulse-blue";
    case "executing":
      return "agent-pulse-green";
    case "syncing":
      return "agent-static-green";
    case "error":
      return "agent-blink-red";
    default:
      return "agent-static-gray";
  }
}

function AgentAvatar({ agent, isSelected, onClick }: { agent: Agent; isSelected: boolean; onClick: () => void }) {
  const initials = agent.name.slice(0, 2).toUpperCase();
  const animClass = getAnimationClass(agent.status);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-lg p-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
        isSelected
          ? "bg-[var(--color-primary-bg)] ring-1 ring-[var(--color-primary)]"
          : "hover:bg-[var(--color-surface-hover)]"
      }`}
    >
      <div className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold ${animClass}`}>
        {initials}
        <span
          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--color-surface)]"
          style={{ background: STATUS_COLORS[agent.status] }}
        />
      </div>
      <span className="max-w-[72px] truncate text-[11px] font-medium text-[var(--color-foreground)]">
        {agent.name}
      </span>
    </button>
  );
}

function AgentPopover({
  agent,
  workOrder,
  tokenUsage,
  onClose,
}: {
  agent: Agent;
  workOrder: WorkOrder | null;
  tokenUsage: number;
  onClose: () => void;
}) {
  return (
    <div className="absolute left-1/2 top-full z-20 mt-2 w-72 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
            style={{ background: STATUS_COLORS[agent.status], color: "var(--color-background)" }}
          >
            {agent.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-foreground)]">{agent.name}</p>
            <p className="text-[11px] text-[var(--color-muted-foreground)]">
              {STATUS_LABELS[agent.status]} · {OFFICE_ZONES[agent.status]}
            </p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-[var(--color-tertiary)] hover:bg-[var(--color-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">
          <X size={14} />
        </button>
      </div>

      {/* 오늘 토큰 소비 */}
      <div className="mb-2 rounded-md border border-[var(--color-border)] bg-[var(--color-background)]/50 p-2">
        <p className="text-[11px] text-[var(--color-tertiary)]">오늘 토큰 소비</p>
        <p className="text-lg font-semibold text-[var(--color-foreground)]">
          {tokenUsage > 0 ? tokenUsage.toLocaleString() : "—"}
        </p>
      </div>

      {/* 현재 WorkOrder */}
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)]/50 p-2">
        <p className="text-[11px] text-[var(--color-tertiary)]">현재 WorkOrder</p>
        {workOrder ? (
          <div className="mt-1">
            <p className="text-xs font-medium text-[var(--color-foreground)]">{workOrder.summary}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                workOrder.status === "in_progress"
                  ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                  : workOrder.status === "completed"
                    ? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
                    : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
              }`}>
                {workOrder.status}
              </span>
              <span className="text-[10px] text-[var(--color-tertiary)]">
                {workOrder.fromAgentId} → {workOrder.toAgentId}
              </span>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">할당된 작업 없음</p>
        )}
      </div>
    </div>
  );
}

export function AgentOfficeView({ initialAgents, agentWorkOrders: initialWorkOrders, agentTokenUsage: initialTokenUsage }: AgentOfficeViewProps) {
  const { agents, agentWorkOrders, agentTokenUsage, wsConnected } = useAgentStatus({
    initialAgents,
    initialWorkOrders,
    initialTokenUsage,
  });
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const agentsByZone = useMemo(() => {
    return STATUS_SEQUENCE.map((status) => ({
      status,
      zoneName: OFFICE_ZONES[status],
      icon: ZONE_ICONS[OFFICE_ZONES[status]] ?? "📍",
      agents: agents.filter((a) => a.status === status && a.isActive !== false),
    }));
  }, [agents]);

  const activeCount = useMemo(
    () => agents.filter((a) => a.status !== "idle" && a.isActive !== false).length,
    [agents],
  );

  const handleSelectAgent = useCallback((id: string) => {
    setSelectedAgentId((prev) => (prev === id ? null : id));
  }, []);

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId) ?? null,
    [agents, selectedAgentId],
  );

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto page-title">에이전트 오피스</h2>
        <span className="vulcan-chip text-xs">전체 {agents.length}</span>
        <span className="vulcan-chip text-xs">활동 중 {activeCount}</span>
        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
          wsConnected
            ? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
            : "bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]"
        }`}>
          {wsConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
          {wsConnected ? "실시간" : "폴링"}
        </span>
      </div>

      {/* 6존 그리드 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {agentsByZone.map((zone) => (
          <article
            key={zone.status}
            className="relative rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition-colors"
          >
            {/* 존 헤더 */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">{zone.icon}</span>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-foreground)]">{zone.zoneName}</h3>
                  <p className="text-[11px] text-[var(--color-tertiary)]">{STATUS_LABELS[zone.status]}</p>
                </div>
              </div>
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                style={{
                  background: `color-mix(in srgb, ${STATUS_COLORS[zone.status]} 15%, transparent)`,
                  color: STATUS_COLORS[zone.status],
                }}
              >
                {zone.agents.length}
              </span>
            </div>

            {/* 에이전트 목록 */}
            <div className="flex flex-wrap gap-1">
              {zone.agents.length > 0 ? (
                zone.agents.map((agent) => (
                  <div key={agent.id} className="relative">
                    <AgentAvatar
                      agent={agent}
                      isSelected={selectedAgentId === agent.id}
                      onClick={() => handleSelectAgent(agent.id)}
                    />
                    {selectedAgentId === agent.id && selectedAgent && (
                      <AgentPopover
                        agent={selectedAgent}
                        workOrder={agentWorkOrders[agent.id] ?? null}
                        tokenUsage={agentTokenUsage[agent.id] ?? 0}
                        onClose={() => setSelectedAgentId(null)}
                      />
                    )}
                  </div>
                ))
              ) : (
                <p className="w-full py-3 text-center text-xs text-[var(--color-tertiary)]">
                  이 구역에 에이전트 없음
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
