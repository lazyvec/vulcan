"use client";

import { useState } from "react";
import { LiveActivityPanel } from "@/components/LiveActivityPanel";
import {
  OFFICE_ZONES,
  STATUS_COLORS,
  STATUS_LABELS,
  statusFromEventType,
} from "@/lib/statusMap";
import type { Agent, AgentStatus, EventItem } from "@/lib/types";
import {
  AlertTriangle,
  BrainCircuit,
  Pencil,
  RefreshCw,
  Zap,
  Coffee,
} from "lucide-react";

const STATUS_SEQUENCE: AgentStatus[] = [
  "idle",
  "writing",
  "researching",
  "executing",
  "syncing",
  "error",
];

interface OfficeViewProps {
  agents: Agent[];
  initialEvents: EventItem[];
}

function nextType(status: AgentStatus): string {
  if (status === "error") return "error";
  if (status === "syncing") return "sync";
  if (status === "writing") return "message";
  return "tool_call";
}

function StatusIcon({ status }: { status: AgentStatus }) {
  const props = { size: 16 };
  switch (status) {
    case "idle":
      return <Coffee {...props} className="text-[var(--color-tertiary)]" />;
    case "writing":
      return <Pencil {...props} className="text-blue-400" />;
    case "researching":
      return <BrainCircuit {...props} className="text-purple-400" />;
    case "executing":
      return <Zap {...props} className="text-cyan-400" />;
    case "syncing":
      return <RefreshCw {...props} className="text-green-400" />;
    case "error":
      return <AlertTriangle {...props} className="text-red-400" />;
    default:
      return null;
  }
}

export function OfficeView({ agents, initialEvents }: OfficeViewProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>(
    agents[0]?.id ?? "hermes"
  );
  const [liveAgents, setLiveAgents] = useState<Agent[]>(agents);

  function handleIncomingEvent(event: EventItem) {
    if (!event.agentId) return;
    const status = statusFromEventType(event.type);
    setLiveAgents((prev) =>
      prev.map((agent) =>
        agent.id === event.agentId
          ? { ...agent, status, statusSince: event.ts, lastSeenAt: event.ts }
          : agent
      )
    );
  }

  async function runDemo(status: AgentStatus) {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "vulcan-demo",
        type: nextType(status),
        summary: `[DEMO] ${selectedAgentId} status transition: ${STATUS_LABELS[status]}`,
        agentId: selectedAgentId,
        payloadJson: JSON.stringify({ status, zone: OFFICE_ZONES[status] }),
      }),
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <section className="vulcan-card flex flex-col p-4">
        <h2 className="mb-4 text-lg font-semibold">Agent Status</h2>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {liveAgents.map((agent) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => setSelectedAgentId(agent.id)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                selectedAgentId === agent.id
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-muted)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-[var(--color-foreground)]">{agent.name}</span>
                <div
                  className={`flex size-7 items-center justify-center rounded-full text-xs font-bold ${
                    agent.status === "idle" ? "" : "status-glow"
                  }`}
                  style={{ borderColor: STATUS_COLORS[agent.status] }}
                >
                  <StatusIcon status={agent.status} />
                </div>
              </div>
              <p className="mt-1 text-sm text-[var(--color-tertiary)]">{STATUS_LABELS[agent.status]}</p>
              <p className="text-xs text-[var(--color-tertiary)]">{OFFICE_ZONES[agent.status]}</p>
            </button>
          ))}
        </div>

        <div className="mt-auto rounded-lg border border-dashed border-[var(--color-border)] p-3">
          <p className="mb-2 text-xs font-medium text-[var(--color-tertiary)]">
            Demo Controls (for {selectedAgentId})
          </p>
          <div className="flex flex-wrap gap-2">
            {STATUS_SEQUENCE.map((status) => (
              <button
                key={status}
                type="button"
                data-testid={`office-demo-${status}`}
                className="flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)]"
                onClick={() => runDemo(status)}
              >
                <StatusIcon status={status} />
                {STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </div>
      </section>

      <LiveActivityPanel
        initialEvents={initialEvents}
        title="Office Live Feed"
        onEvent={handleIncomingEvent}
      />
    </div>
  );
}
