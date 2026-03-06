"use client";

import { useMemo, useState } from "react";
import { OFFICE_ZONES, STATUS_COLORS, STATUS_LABELS } from "@/lib/statusMap";
import type { Agent } from "@/lib/types";

interface TeamControlBoardProps {
  initialAgents: Agent[];
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function fetchErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as { error?: string };
    if (data?.error) {
      return `${response.status}: ${data.error}`;
    }
  } catch {
    // Ignore parse errors.
  }
  return `${response.status}: request failed`;
}

export function TeamControlBoard({ initialAgents }: TeamControlBoardProps) {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(initialAgents[0]?.id ?? "");
  const [message, setMessage] = useState("Please report current status.");
  const [taskLabel, setTaskLabel] = useState("status-check");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>("");
  const [error, setError] = useState<string>("");

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId) ?? null,
    [agents, selectedAgentId],
  );

  async function refreshAgents() {
    const response = await fetch("/api/agents?includeInactive=1");
    if (!response.ok) {
      throw new Error(await fetchErrorMessage(response));
    }
    const data = (await response.json()) as { agents?: Agent[] };
    const nextAgents = Array.isArray(data.agents) ? data.agents : [];
    setAgents(nextAgents);
    if (!nextAgents.some((agent) => agent.id === selectedAgentId)) {
      setSelectedAgentId(nextAgents[0]?.id ?? "");
    }
  }

  async function performAction(label: string, action: () => Promise<void>) {
    setBusyAction(label);
    setError("");
    setNotice("");
    try {
      await action();
      await refreshAgents();
      setNotice(`${label} 완료`);
    } catch (actionError) {
      setError(`${label} 실패: ${toErrorMessage(actionError)}`);
    } finally {
      setBusyAction(null);
    }
  }

  async function deactivateAgent() {
    if (!selectedAgent) return;
    await performAction("Deactivate", async () => {
      const response = await fetch(`/api/agents/${selectedAgent.id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(await fetchErrorMessage(response));
      }
    });
  }

  async function reactivateAgent() {
    if (!selectedAgent) return;
    await performAction("Reactivate", async () => {
      const response = await fetch(`/api/agents/${selectedAgent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true, status: "idle" }),
      });
      if (!response.ok) {
        throw new Error(await fetchErrorMessage(response));
      }
    });
  }

  async function sendDirectCommand() {
    if (!selectedAgent) return;
    await performAction("Direct Command", async () => {
      const response = await fetch(`/api/agents/${selectedAgent.id}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!response.ok) {
        throw new Error(await fetchErrorMessage(response));
      }
    });
  }

  async function sendDelegateCommand() {
    if (!selectedAgent) return;
    await performAction("Delegate", async () => {
      const response = await fetch(`/api/agents/${selectedAgent.id}/delegate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, taskLabel }),
      });
      if (!response.ok) {
        throw new Error(await fetchErrorMessage(response));
      }
    });
  }

  async function sendSessionMessage() {
    if (!selectedAgent) return;
    await performAction("Session Send", async () => {
      const response = await fetch("/api/gateway/sessions/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "hermes",
          to: selectedAgent.id,
          message,
        }),
      });
      if (!response.ok) {
        throw new Error(await fetchErrorMessage(response));
      }
    });
  }

  async function spawnSessionTask() {
    if (!selectedAgent) return;
    await performAction("Session Spawn", async () => {
      const response = await fetch("/api/gateway/sessions/spawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "hermes",
          to: selectedAgent.id,
          task: taskLabel,
          message,
        }),
      });
      if (!response.ok) {
        throw new Error(await fetchErrorMessage(response));
      }
    });
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
      <article className="vulcan-card p-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Agent Control Panel</h2>
          <button
            type="button"
            className="rounded border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-tertiary)] transition-colors hover:bg-[var(--color-muted)]"
            onClick={() => void performAction("Refresh", refreshAgents)}
            disabled={Boolean(busyAction)}
          >
            {busyAction === "Refresh" ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--color-tertiary)]">Target Agent</span>
            <select
              value={selectedAgentId}
              onChange={(event) => setSelectedAgentId(event.target.value)}
              className="vulcan-input w-full"
            >
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} {agent.isActive === false ? "(inactive)" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-[var(--color-tertiary)]">Message</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="vulcan-input min-h-[88px] w-full resize-y"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-[var(--color-tertiary)]">Task Label</span>
            <input
              value={taskLabel}
              onChange={(event) => setTaskLabel(event.target.value)}
              className="vulcan-input w-full"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!selectedAgent || Boolean(busyAction)}
            onClick={() => void sendDirectCommand()}
          >
            Direct Command
          </button>
          <button
            type="button"
            className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!selectedAgent || Boolean(busyAction)}
            onClick={() => void sendDelegateCommand()}
          >
            Delegate via Hermes
          </button>
          <button
            type="button"
            className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!selectedAgent || Boolean(busyAction)}
            onClick={() => void sendSessionMessage()}
          >
            Session Send
          </button>
          <button
            type="button"
            className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!selectedAgent || Boolean(busyAction)}
            onClick={() => void spawnSessionTask()}
          >
            Session Spawn
          </button>
        </div>

        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!selectedAgent || selectedAgent.isActive === false || Boolean(busyAction)}
            onClick={() => void deactivateAgent()}
          >
            Deactivate
          </button>
          <button
            type="button"
            className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!selectedAgent || selectedAgent.isActive !== false || Boolean(busyAction)}
            onClick={() => void reactivateAgent()}
          >
            Reactivate
          </button>
        </div>

        {notice ? <p className="mt-3 text-xs text-green-300">{notice}</p> : null}
        {error ? <p className="mt-3 text-xs text-red-300">{error}</p> : null}
      </article>

      <section className="grid gap-3">
        {agents.map((agent) => (
          <article
            key={agent.id}
            className={`vulcan-card p-3 transition-colors ${
              selectedAgentId === agent.id ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => setSelectedAgentId(agent.id)}
              className="w-full text-left"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{agent.name}</h3>
                <span className="vulcan-chip" style={{ color: STATUS_COLORS[agent.status] }}>
                  {STATUS_LABELS[agent.status]}
                </span>
              </div>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Mission: {agent.mission}
              </p>
              <p className="mt-1 text-xs text-[var(--color-tertiary)]">
                Zone: {OFFICE_ZONES[agent.status]}
              </p>
              <p className="mt-1 text-xs text-[var(--color-tertiary)]">
                Active: {agent.isActive === false ? "No" : "Yes"}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {agent.roleTags.map((tag) => (
                  <span key={tag} className="vulcan-chip">
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          </article>
        ))}
      </section>
    </section>
  );
}
