"use client";

import { useEffect, useMemo, useState } from "react";
import { OFFICE_ZONES, STATUS_COLORS, STATUS_LABELS } from "@/lib/statusMap";
import type { Agent, AgentStatus } from "@/lib/types";

interface TeamControlBoardProps {
  initialAgents: Agent[];
}

const STATUS_ORDER: AgentStatus[] = [
  "executing",
  "writing",
  "researching",
  "syncing",
  "idle",
  "error",
];

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function normalizeTaskLabel(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function isTaskLabelValid(value: string) {
  return /^[a-z0-9][a-z0-9-_]{1,63}$/.test(value);
}

function confirmAction(message: string) {
  if (typeof window === "undefined") {
    return true;
  }
  return window.confirm(message);
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

function actionButtonClassName() {
  return "rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] disabled:cursor-not-allowed disabled:opacity-60";
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

  useEffect(() => {
    if (!agents.length) {
      setSelectedAgentId("");
      return;
    }
    if (!agents.some((agent) => agent.id === selectedAgentId)) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  const activeAgents = useMemo(
    () => agents.filter((agent) => agent.isActive !== false),
    [agents],
  );
  const inactiveAgents = useMemo(
    () => agents.filter((agent) => agent.isActive === false),
    [agents],
  );

  const groupedActiveByStatus = useMemo(
    () =>
      STATUS_ORDER.map((status) => ({
        status,
        agents: activeAgents.filter((agent) => agent.status === status),
      })).filter((section) => section.agents.length > 0),
    [activeAgents],
  );

  async function refreshAgents() {
    const response = await fetch("/api/agents?includeInactive=1");
    if (!response.ok) {
      throw new Error(await fetchErrorMessage(response));
    }
    const data = (await response.json()) as { agents?: Agent[] };
    const nextAgents = Array.isArray(data.agents) ? data.agents : [];
    setAgents(nextAgents);
  }

  function validateInputs(options?: { requireTaskLabel?: boolean }) {
    const trimmedMessage = message.trim();
    const normalizedTaskLabel = normalizeTaskLabel(taskLabel);

    if (!trimmedMessage) {
      setError("Message is required.");
      return null;
    }

    if (options?.requireTaskLabel && !isTaskLabelValid(normalizedTaskLabel)) {
      setError("Task Label must start with a-z0-9 and use only a-z, 0-9, -, _. (2~64 chars)");
      return null;
    }

    return {
      trimmedMessage,
      normalizedTaskLabel,
    };
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
    if (!confirmAction(`${selectedAgent.name}를 비활성화할까요?`)) {
      return;
    }

    await performAction("Deactivate", async () => {
      const response = await fetch(`/api/agents/${selectedAgent.id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(await fetchErrorMessage(response));
      }
    });
  }

  async function reactivateAgent() {
    if (!selectedAgent) return;
    if (!confirmAction(`${selectedAgent.name}를 재활성화할까요?`)) {
      return;
    }

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

    const validated = validateInputs();
    if (!validated) return;

    await performAction("Direct Command", async () => {
      const response = await fetch(`/api/agents/${selectedAgent.id}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: validated.trimmedMessage }),
      });
      if (!response.ok) {
        throw new Error(await fetchErrorMessage(response));
      }
    });
  }

  async function sendDelegateCommand() {
    if (!selectedAgent) return;

    const validated = validateInputs({ requireTaskLabel: true });
    if (!validated) return;

    await performAction("Delegate", async () => {
      const response = await fetch(`/api/agents/${selectedAgent.id}/delegate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: validated.trimmedMessage,
          taskLabel: validated.normalizedTaskLabel,
        }),
      });
      if (!response.ok) {
        throw new Error(await fetchErrorMessage(response));
      }
    });
  }

  async function sendSessionMessage() {
    if (!selectedAgent) return;

    const validated = validateInputs();
    if (!validated) return;

    await performAction("Session Send", async () => {
      const response = await fetch("/api/gateway/sessions/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "hermes",
          to: selectedAgent.id,
          message: validated.trimmedMessage,
        }),
      });
      if (!response.ok) {
        throw new Error(await fetchErrorMessage(response));
      }
    });
  }

  async function spawnSessionTask() {
    if (!selectedAgent) return;

    const validated = validateInputs({ requireTaskLabel: true });
    if (!validated) return;

    await performAction("Session Spawn", async () => {
      const response = await fetch("/api/gateway/sessions/spawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "hermes",
          to: selectedAgent.id,
          task: validated.normalizedTaskLabel,
          message: validated.trimmedMessage,
        }),
      });
      if (!response.ok) {
        throw new Error(await fetchErrorMessage(response));
      }
    });
  }

  const selectedAgentInactive = selectedAgent?.isActive === false;

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(340px,0.95fr)_minmax(0,1.4fr)]">
      <article className="vulcan-card p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">Agent Control Panel</h2>
            <p className="mt-1 text-xs text-[var(--color-tertiary)]">
              실행 제어는 여기서, 에이전트 상태 모니터링은 오른쪽 roster에서 확인
            </p>
          </div>
          <button
            type="button"
            className="rounded border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-tertiary)] transition-colors hover:bg-[var(--color-muted)]"
            onClick={() => void performAction("Refresh", refreshAgents)}
            disabled={Boolean(busyAction)}
          >
            {busyAction === "Refresh" ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {selectedAgent ? (
          <div className="mb-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[var(--color-foreground)]">{selectedAgent.name}</p>
              <span className="vulcan-chip text-xs" style={{ color: STATUS_COLORS[selectedAgent.status] }}>
                {STATUS_LABELS[selectedAgent.status]}
              </span>
            </div>
            <p className="text-xs text-[var(--color-muted-foreground)]">{selectedAgent.mission}</p>
            <p className="mt-1 text-xs text-[var(--color-tertiary)]">
              Zone: {OFFICE_ZONES[selectedAgent.status]} · Active: {selectedAgent.isActive === false ? "No" : "Yes"}
            </p>
          </div>
        ) : null}

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
              className="vulcan-input min-h-[96px] w-full resize-y"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-[var(--color-tertiary)]">Task Label</span>
            <input
              value={taskLabel}
              onChange={(event) => setTaskLabel(event.target.value)}
              onBlur={() => setTaskLabel((prev) => normalizeTaskLabel(prev))}
              className="vulcan-input w-full"
            />
            <p className="mt-1 text-[11px] text-[var(--color-tertiary)]">
              예: `status-check` (a-z, 0-9, -, _)
            </p>
          </label>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-tertiary)]">
            Command Actions
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className={actionButtonClassName()}
              disabled={!selectedAgent || Boolean(busyAction) || selectedAgentInactive}
              onClick={() => void sendDirectCommand()}
            >
              Direct Command
            </button>
            <button
              type="button"
              className={actionButtonClassName()}
              disabled={!selectedAgent || Boolean(busyAction) || selectedAgentInactive}
              onClick={() => void sendDelegateCommand()}
            >
              Delegate via Hermes
            </button>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-tertiary)]">
            Session Actions
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className={actionButtonClassName()}
              disabled={!selectedAgent || Boolean(busyAction) || selectedAgentInactive}
              onClick={() => void sendSessionMessage()}
            >
              Session Send
            </button>
            <button
              type="button"
              className={actionButtonClassName()}
              disabled={!selectedAgent || Boolean(busyAction) || selectedAgentInactive}
              onClick={() => void spawnSessionTask()}
            >
              Session Spawn
            </button>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-tertiary)]">
            Lifecycle Actions
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className={actionButtonClassName()}
              disabled={!selectedAgent || selectedAgentInactive || Boolean(busyAction)}
              onClick={() => void deactivateAgent()}
            >
              Deactivate
            </button>
            <button
              type="button"
              className={actionButtonClassName()}
              disabled={!selectedAgent || !selectedAgentInactive || Boolean(busyAction)}
              onClick={() => void reactivateAgent()}
            >
              Reactivate
            </button>
          </div>
        </div>

        {notice ? <p className="mt-3 text-xs text-green-300">{notice}</p> : null}
        {error ? <p className="mt-3 text-xs text-red-300">{error}</p> : null}
      </article>

      <section className="space-y-3">
        <article className="vulcan-card p-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="vulcan-chip">Total {agents.length}</span>
            <span className="vulcan-chip">Active {activeAgents.length}</span>
            <span className="vulcan-chip">Inactive {inactiveAgents.length}</span>
          </div>
        </article>

        {groupedActiveByStatus.map((section) => (
          <article key={section.status} className="vulcan-card p-3">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{STATUS_LABELS[section.status]}</h3>
              <span className="text-xs text-[var(--color-tertiary)]">
                {OFFICE_ZONES[section.status]} · {section.agents.length}
              </span>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {section.agents.map((agent) => {
                const selected = agent.id === selectedAgentId;
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => setSelectedAgentId(agent.id)}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      selected
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-12)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-muted)]"
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--color-foreground)]">{agent.name}</p>
                      <span className="text-[11px]" style={{ color: STATUS_COLORS[agent.status] }}>
                        {STATUS_LABELS[agent.status]}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-xs text-[var(--color-muted-foreground)]">{agent.mission}</p>
                    <p className="mt-1 text-[11px] text-[var(--color-tertiary)]">
                      Zone: {OFFICE_ZONES[agent.status]}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {agent.roleTags.map((tag) => (
                        <span key={tag} className="vulcan-chip text-[11px]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </article>
        ))}

        {inactiveAgents.length > 0 ? (
          <article className="vulcan-card p-3">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Inactive Agents</h3>
              <span className="text-xs text-[var(--color-tertiary)]">{inactiveAgents.length}</span>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {inactiveAgents.map((agent) => {
                const selected = agent.id === selectedAgentId;
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => setSelectedAgentId(agent.id)}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      selected
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-12)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-muted)]"
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--color-foreground)]">{agent.name}</p>
                      <span className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[10px] text-amber-300">
                        Inactive
                      </span>
                    </div>
                    <p className="line-clamp-2 text-xs text-[var(--color-muted-foreground)]">{agent.mission}</p>
                    <p className="mt-1 text-[11px] text-[var(--color-tertiary)]">
                      Last Status: {STATUS_LABELS[agent.status]}
                    </p>
                  </button>
                );
              })}
            </div>
          </article>
        ) : null}
      </section>
    </section>
  );
}
