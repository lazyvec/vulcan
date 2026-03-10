"use client";

import { Button } from "@/components/ui/Button";
import type { Agent } from "@/lib/types";

interface AgentLifecyclePanelProps {
  selectedAgent: Agent | null;
  isInactive: boolean;
  isPaused: boolean;
  busyAction: string | null;
  onAction: (label: string, action: () => Promise<void>) => Promise<void>;
}

function confirmAction(message: string) {
  if (typeof window === "undefined") return true;
  return window.confirm(message);
}

async function fetchErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as { error?: string };
    if (data?.error) return `${response.status}: ${data.error}`;
  } catch { /* ignore */ }
  return `${response.status}: request failed`;
}

export function AgentLifecyclePanel({ selectedAgent, isInactive, isPaused, busyAction, onAction }: AgentLifecyclePanelProps) {
  const busy = Boolean(busyAction);

  async function pauseAgent() {
    if (!selectedAgent) return;
    if (!confirmAction(`${selectedAgent.name}를 일시정지할까요?`)) return;
    await onAction("Pause", async () => {
      const res = await fetch(`/api/agents/${selectedAgent.id}/pause`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      if (!res.ok) throw new Error(await fetchErrorMessage(res));
    });
  }

  async function resumeAgent() {
    if (!selectedAgent) return;
    if (!confirmAction(`${selectedAgent.name}를 재개할까요?`)) return;
    await onAction("Resume", async () => {
      const res = await fetch(`/api/agents/${selectedAgent.id}/resume`, { method: "POST" });
      if (!res.ok) throw new Error(await fetchErrorMessage(res));
    });
  }

  async function deactivateAgent() {
    if (!selectedAgent) return;
    if (!confirmAction(`${selectedAgent.name}를 비활성화할까요?`)) return;
    await onAction("Deactivate", async () => {
      const res = await fetch(`/api/agents/${selectedAgent.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await fetchErrorMessage(res));
    });
  }

  async function reactivateAgent() {
    if (!selectedAgent) return;
    if (!confirmAction(`${selectedAgent.name}를 재활성화할까요?`)) return;
    await onAction("Reactivate", async () => {
      const res = await fetch(`/api/agents/${selectedAgent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true, status: "idle" }),
      });
      if (!res.ok) throw new Error(await fetchErrorMessage(res));
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-tertiary)]">생명주기 액션</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="secondary" disabled={!selectedAgent || isInactive || isPaused || busy} onClick={() => void pauseAgent()}>일시정지</Button>
        <Button variant="secondary" disabled={!selectedAgent || isInactive || !isPaused || busy} onClick={() => void resumeAgent()}>재개</Button>
        <Button variant="destructive" disabled={!selectedAgent || isInactive || busy} onClick={() => void deactivateAgent()}>비활성화</Button>
        <Button variant="secondary" disabled={!selectedAgent || !isInactive || busy} onClick={() => void reactivateAgent()}>재활성화</Button>
      </div>
    </div>
  );
}
