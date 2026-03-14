"use client";

import { useMemo, useState } from "react";
import { OFFICE_ZONES, STATUS_COLORS, STATUS_LABELS } from "@/lib/statusMap";
import { useAgentStatus } from "@/hooks/useAgentStatus";
import type { Agent, AgentStatus, WorkOrder } from "@/lib/types";
import { Wifi, WifiOff, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMounted } from "@/hooks/useMounted";

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

function getAgentAura(status: AgentStatus): string {
  switch (status) {
    case "researching": return "shadow-[0_0_15px_-3px_var(--color-researching)]";
    case "executing": return "shadow-[0_0_15px_-3px_var(--color-executing)]";
    case "writing": return "shadow-[0_0_15px_-3px_var(--color-primary)]";
    case "error": return "shadow-[0_0_15px_-3px_var(--color-destructive)]";
    default: return "";
  }
}

function AgentAvatar({ agent, isSelected, onClick }: { agent: Agent; isSelected: boolean; onClick: () => void }) {
  const initials = agent.name.slice(0, 2).toUpperCase();
  const isActive = agent.status !== "idle" && agent.status !== "error";
  const auraClass = getAgentAura(agent.status);

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`group relative flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-1.5 rounded-xl p-2.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
        isSelected
          ? "bg-[var(--color-primary-bg)] ring-1 ring-[var(--color-primary)]"
          : "hover:bg-[var(--color-surface-hover)]"
      }`}
    >
      <div className={`relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-glass-border bg-[var(--color-background)] text-sm font-bold transition-all ${isActive ? "agent-alive-pulse" : ""} ${auraClass}`}>
        <span className="text-gradient">{initials}</span>
        <span
          className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--color-surface)] shadow-sm"
          style={{ background: STATUS_COLORS[agent.status] }}
        />
      </div>
      <span className="max-w-[80px] truncate text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] group-hover:text-[var(--color-foreground)]">
        {agent.name}
      </span>
    </motion.button>
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
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className="absolute left-1/2 top-full z-30 mt-3 w-72 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl border border-glass-border bg-[var(--color-surface)] p-5 shadow-2xl backdrop-blur-xl"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-black shadow-inner"
            style={{ background: STATUS_COLORS[agent.status], color: "white" }}
          >
            {agent.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-[var(--color-foreground)]">{agent.name}</p>
            <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--color-tertiary)]">
              {STATUS_LABELS[agent.status]} · {OFFICE_ZONES[agent.status]}
            </p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-tertiary)] hover:bg-[var(--color-muted)] transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="space-y-3">
        <div className="rounded-xl bg-[var(--color-background)]/40 p-3 shadow-inner border border-glass-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-tertiary)] opacity-70">Daily Tokens</p>
          <p className="mt-0.5 text-xl font-black text-[var(--color-foreground)] tracking-tight">
            {tokenUsage > 0 ? tokenUsage.toLocaleString() : "0"}
          </p>
        </div>

        <div className="rounded-xl bg-[var(--color-background)]/40 p-3 shadow-inner border border-glass-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-tertiary)] opacity-70">Current Mission</p>
          {workOrder ? (
            <div className="mt-1.5">
              <p className="text-xs font-semibold leading-relaxed text-[var(--color-foreground)] line-clamp-2">{workOrder.summary}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter ${
                  workOrder.status === "in_progress"
                    ? "bg-[var(--color-primary-bg)] text-[var(--color-primary)]"
                    : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
                }`}>
                  {workOrder.status}
                </span>
                <span className="text-[10px] font-medium text-[var(--color-tertiary)]">
                  {workOrder.fromAgentId} ⇢ {workOrder.toAgentId}
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-1.5 text-xs font-medium text-[var(--color-muted-foreground)] italic">지정된 임무가 없습니다.</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function AgentOfficeView({ initialAgents, agentWorkOrders: initialWorkOrders, agentTokenUsage: initialTokenUsage }: AgentOfficeViewProps) {
  const mounted = useMounted();
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

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="mr-auto page-title tracking-tight font-black">에이전트 오피스</h2>
        <div className="flex gap-1.5">
          <span className="vulcan-chip border-glass-border shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-foreground)] opacity-40" />
            TOTAL {agents.length}
          </span>
          <span className="vulcan-chip border-glass-border shadow-sm bg-[var(--color-primary-bg)] text-[var(--color-primary)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)] animate-pulse" />
            ACTIVE {activeCount}
          </span>
        </div>
        <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black tracking-widest border border-glass-border ${
          wsConnected
            ? "bg-[var(--color-success-bg)] text-[var(--color-success-text)]"
            : "bg-[var(--color-destructive-bg)] text-[var(--color-destructive-text)]"
        }`}>
          {wsConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
          {wsConnected ? "LIVE" : "POLLING"}
        </span>
      </div>

      {/* 6존 그리드 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agentsByZone.map((zone) => (
          <article
            key={zone.status}
            className="vulcan-card group p-4 border-glass-border"
          >
            {/* 존 헤더 */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-background)] shadow-inner text-lg">
                  {zone.icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--color-foreground)]">{zone.zoneName}</h3>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-tertiary)] opacity-70">{STATUS_LABELS[zone.status]}</p>
                </div>
              </div>
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black border border-glass-border shadow-sm"
                style={{
                  background: `color-mix(in srgb, ${STATUS_COLORS[zone.status]} 15%, transparent)`,
                  color: STATUS_COLORS[zone.status],
                }}
              >
                {zone.agents.length}
              </span>
            </div>

            {/* 에이전트 목록 */}
            <div className="flex flex-wrap gap-1.5">
              {zone.agents.length > 0 ? (
                zone.agents.map((agent) => (
                  <div key={agent.id} className="relative">
                    <AgentAvatar
                      agent={agent}
                      isSelected={selectedAgentId === agent.id}
                      onClick={() => setSelectedAgentId(prev => prev === agent.id ? null : agent.id)}
                    />
                    <AnimatePresence>
                      {mounted && selectedAgentId === agent.id && (
                        <AgentPopover
                          agent={agent}
                          workOrder={agentWorkOrders[agent.id] ?? null}
                          tokenUsage={agentTokenUsage[agent.id] ?? 0}
                          onClose={() => setSelectedAgentId(null)}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                ))
              ) : (
                <div className="w-full py-5 flex flex-col items-center justify-center rounded-xl border border-dashed border-glass-border bg-white/[0.02]">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-tertiary)] opacity-40">
                    No agents in this zone
                  </p>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
