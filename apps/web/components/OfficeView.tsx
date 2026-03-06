"use client";

import { useEffect, useState } from "react";
import { LiveActivityPanel } from "@/components/LiveActivityPanel";
import {
  OFFICE_ZONES,
  STATUS_COLORS,
  STATUS_LABELS,
  statusFromEventType,
} from "@/lib/statusMap";
import type { Agent, AgentCommand, AgentStatus, EventItem } from "@/lib/types";
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

const COMMAND_STATUS_LABELS: Record<AgentCommand["status"], string> = {
  queued: "Queued",
  sent: "Sent",
  failed: "Failed",
};

const COMMAND_STATUS_COLORS: Record<AgentCommand["status"], string> = {
  queued: "text-amber-300 border-amber-500/40 bg-amber-500/10",
  sent: "text-green-300 border-green-500/40 bg-green-500/10",
  failed: "text-red-300 border-red-500/40 bg-red-500/10",
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function OfficeView({ agents, initialEvents }: OfficeViewProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>(
    agents[0]?.id ?? "hermes"
  );
  const [liveAgents, setLiveAgents] = useState<Agent[]>(agents);
  const [commands, setCommands] = useState<AgentCommand[]>([]);
  const [commandsLoading, setCommandsLoading] = useState(false);
  const [commandsError, setCommandsError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

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

  async function loadCommands(agentId: string) {
    if (!agentId) {
      setCommands([]);
      return;
    }

    setCommandsLoading(true);
    setCommandsError(null);
    try {
      const response = await fetch(
        `/api/agent-commands?agentId=${encodeURIComponent(agentId)}&limit=20`
      );
      if (!response.ok) {
        throw new Error(`failed to load commands (${response.status})`);
      }
      const data = (await response.json()) as { commands?: AgentCommand[] };
      setCommands(Array.isArray(data.commands) ? data.commands : []);
    } catch (error) {
      setCommandsError(error instanceof Error ? error.message : "failed to load commands");
      setCommands([]);
    } finally {
      setCommandsLoading(false);
    }
  }

  async function retryCommand(commandId: string) {
    setRetryingId(commandId);
    setCommandsError(null);
    try {
      const response = await fetch(`/api/agent-commands/${commandId}/retry`, {
        method: "POST",
      });
      if (!response.ok) {
        let detail = "";
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload.error) {
            detail = `: ${payload.error}`;
          }
        } catch {
          // Ignore response parse failure.
        }
        throw new Error(`retry failed (${response.status})${detail}`);
      }
      await loadCommands(selectedAgentId);
    } catch (error) {
      setCommandsError(error instanceof Error ? error.message : "retry failed");
    } finally {
      setRetryingId(null);
    }
  }

  useEffect(() => {
    void loadCommands(selectedAgentId);
  }, [selectedAgentId]);

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

        <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-[var(--color-tertiary)]">
              Recent Commands (for {selectedAgentId})
            </p>
            <button
              type="button"
              className="rounded border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-tertiary)] transition-colors hover:bg-[var(--color-muted)]"
              onClick={() => void loadCommands(selectedAgentId)}
              disabled={commandsLoading}
            >
              {commandsLoading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {commandsError ? (
            <p className="mb-2 text-xs text-red-300">{commandsError}</p>
          ) : null}

          <div className="space-y-2">
            {commands.map((command) => (
              <article
                key={command.id}
                className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-medium text-[var(--color-foreground)]">
                    {command.mode === "delegate" ? "Delegate via Hermes" : "Direct Command"}
                  </p>
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${COMMAND_STATUS_COLORS[command.status]}`}
                  >
                    {COMMAND_STATUS_LABELS[command.status]}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--color-tertiary)]">
                  {formatTime(command.createdAt)} · {command.id}
                </p>
                {command.error ? (
                  <p className="mt-1 line-clamp-2 text-[11px] text-red-300">{command.error}</p>
                ) : null}
                {command.status === "failed" ? (
                  <button
                    type="button"
                    className="mt-2 rounded border border-[var(--color-border)] px-2 py-1 text-[11px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => void retryCommand(command.id)}
                    disabled={retryingId === command.id}
                  >
                    {retryingId === command.id ? "Retrying..." : "Retry"}
                  </button>
                ) : null}
              </article>
            ))}
            {!commandsLoading && commands.length === 0 ? (
              <p className="text-xs text-[var(--color-tertiary)]">No command history yet.</p>
            ) : null}
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
