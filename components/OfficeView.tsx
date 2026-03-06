"use client";

import { useMemo, useState } from "react";
import { LiveActivityPanel } from "@/components/LiveActivityPanel";
import {
  OFFICE_ZONE_POSITION,
  OFFICE_ZONES,
  STATUS_COLORS,
  STATUS_LABELS,
  statusFromEventType,
} from "@/lib/statusMap";
import type { Agent, AgentStatus, EventItem } from "@/lib/types";

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
  if (status === "error") {
    return "error";
  }
  if (status === "syncing") {
    return "sync";
  }
  if (status === "writing") {
    return "message";
  }
  return "tool_call";
}

export function OfficeView({ agents, initialEvents }: OfficeViewProps) {
  const [selectedAgent, setSelectedAgent] = useState<string>(agents[0]?.id ?? "hermes");
  const [liveAgents, setLiveAgents] = useState<Agent[]>(agents);

  const selected = useMemo(
    () => liveAgents.find((agent) => agent.id === selectedAgent),
    [liveAgents, selectedAgent],
  );
  const groupedAgents = useMemo(() => {
    const buckets = new Map<AgentStatus, Agent[]>();
    for (const status of STATUS_SEQUENCE) {
      buckets.set(status, []);
    }
    for (const agent of liveAgents) {
      const bucket = buckets.get(agent.status);
      if (bucket) {
        bucket.push(agent);
      }
    }
    return STATUS_SEQUENCE.map((status) => ({ status, agents: buckets.get(status) ?? [] })).filter(
      (entry) => entry.agents.length > 0,
    );
  }, [liveAgents]);

  async function runDemo(status: AgentStatus) {
    if (!selected) {
      return;
    }

    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "vulcan-demo",
        type: nextType(status),
        summary: `${selected.name} 상태 전환: ${STATUS_LABELS[status]}`,
        agentId: selected.id,
        payloadJson: JSON.stringify({ status, zone: OFFICE_ZONES[status] }),
      }),
    });
  }

  function handleIncomingEvent(event: EventItem) {
    if (!event.agentId) {
      return;
    }

    const status = statusFromEventType(event.type);

    setLiveAgents((prev) =>
      prev.map((agent) =>
        agent.id === event.agentId
          ? {
              ...agent,
              status,
              statusSince: event.ts,
              lastSeenAt: event.ts,
            }
          : agent,
      ),
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <section className="vulcan-card p-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-sm font-semibold">Office Deck</h2>
          <select
            className="vulcan-input w-48"
            value={selectedAgent}
            onChange={(event) => setSelectedAgent(event.target.value)}
          >
            {liveAgents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {STATUS_SEQUENCE.map((status) => (
            <button
              key={status}
              type="button"
              data-testid={`office-demo-${status}`}
              className="rounded-[var(--radius-control)] border px-3 py-2 text-left transition hover:translate-y-[-1px]"
              style={{
                borderColor: "var(--color-border)",
                background: "rgba(41,37,36,0.55)",
              }}
              onClick={() => runDemo(status)}
            >
              <p className="text-xs" style={{ color: STATUS_COLORS[status] }}>
                {STATUS_LABELS[status]}
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)]">{OFFICE_ZONES[status]}</p>
            </button>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {groupedAgents.map(({ status, agents: byStatusAgents }) => (
            <span key={status} className="vulcan-chip">
              {STATUS_LABELS[status]}: {byStatusAgents.map((agent) => agent.name).join(", ")}
            </span>
          ))}
        </div>

        <div className="rounded-[var(--radius-modal)] border p-4" style={{ borderColor: "var(--color-border)" }}>
          <p className="mb-3 text-xs uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            Mission Floor (Deterministic Zone Mapping)
          </p>

          <div
            className="relative min-h-[360px] overflow-hidden rounded-[var(--radius-card)] border"
            style={{ borderColor: "var(--color-border)", background: "rgba(12,10,9,0.82)" }}
          >
            {STATUS_SEQUENCE.map((status) => {
              const zone = OFFICE_ZONE_POSITION[status];
              return (
                <div
                  key={status}
                  className="absolute rounded-[var(--radius-control)] border px-2 py-1 text-[10px] uppercase tracking-[0.08em]"
                  style={{
                    left: `${zone.left}%`,
                    top: `${zone.top}%`,
                    transform: "translate(-50%, -50%)",
                    borderColor: "var(--color-border)",
                    color: STATUS_COLORS[status],
                    background: "rgba(28,25,23,0.7)",
                  }}
                >
                  {zone.title}
                </div>
              );
            })}

            {liveAgents.map((agent, index) => {
              const zone = OFFICE_ZONE_POSITION[agent.status];
              const xJitter = (index % 3) * 2 - 2;
              const yJitter = Math.floor(index / 3) * 2;

              return (
                <div
                  key={agent.id}
                  className="absolute transition-all duration-500"
                  style={{
                    left: `calc(${zone.left + xJitter}% - 16px)`,
                    top: `calc(${zone.top + yJitter}% - 16px)`,
                  }}
                >
                  <div
                    className={`status-pulse flex size-8 items-center justify-center rounded-full border text-[10px] font-bold ${
                      agent.status === "idle" ? "" : "status-glow"
                    }`}
                    style={{
                      borderColor: STATUS_COLORS[agent.status],
                      color: "var(--color-foreground)",
                      background: "rgba(41,37,36,0.92)",
                    }}
                    title={`${agent.name}: ${STATUS_LABELS[agent.status]}`}
                  >
                    {agent.name.slice(0, 2).toUpperCase()}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {liveAgents.map((agent) => (
              <article
                key={agent.id}
                className="rounded-[var(--radius-control)] border px-3 py-2"
                style={{ borderColor: "var(--color-border)", background: "rgba(41,37,36,0.48)" }}
              >
                <p className="text-sm font-semibold">{agent.name}</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {STATUS_LABELS[agent.status]} · {OFFICE_ZONES[agent.status]}
                </p>
              </article>
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
