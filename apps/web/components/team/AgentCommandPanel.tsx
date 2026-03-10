"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { OFFICE_ZONES, STATUS_LABELS } from "@/lib/statusMap";
import { Badge } from "@/components/ui/Badge";
import { statusBadgeMap } from "@/lib/ui-utils";
import type { Agent } from "@/lib/types";

interface AgentCommandPanelProps {
  agents: Agent[];
  selectedAgent: Agent | null;
  selectedAgentId: string;
  onSelectAgent: (id: string) => void;
  onAction: (label: string, action: () => Promise<void>) => Promise<void>;
  busyAction: string | null;
  isInactive: boolean;
  isPaused: boolean;
}

function normalizeTaskLabel(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function isTaskLabelValid(value: string) {
  return /^[a-z0-9][a-z0-9-_]{1,63}$/.test(value);
}

async function fetchErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as { error?: string };
    if (data?.error) return `${response.status}: ${data.error}`;
  } catch { /* ignore */ }
  return `${response.status}: request failed`;
}

export function AgentCommandPanel({
  agents,
  selectedAgent,
  selectedAgentId,
  onSelectAgent,
  onAction,
  busyAction,
  isInactive,
  isPaused,
}: AgentCommandPanelProps) {
  const [message, setMessage] = useState("Please report current status.");
  const [taskLabel, setTaskLabel] = useState("status-check");
  const [error, setError] = useState("");
  const fieldId = useId();

  function validateInputs(options?: { requireTaskLabel?: boolean }) {
    const trimmedMessage = message.trim();
    const normalizedTaskLabel = normalizeTaskLabel(taskLabel);
    if (!trimmedMessage) { setError("메시지를 입력해주세요."); return null; }
    if (options?.requireTaskLabel && !isTaskLabelValid(normalizedTaskLabel)) {
      setError("태스크 레이블: a-z0-9, -, _ (2~64자)");
      return null;
    }
    setError("");
    return { trimmedMessage, normalizedTaskLabel };
  }

  const disabled = !selectedAgent || Boolean(busyAction) || isInactive || isPaused;

  async function sendDirectCommand() {
    if (!selectedAgent) return;
    const v = validateInputs();
    if (!v) return;
    await onAction("Direct Command", async () => {
      const res = await fetch(`/api/agents/${selectedAgent.id}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: v.trimmedMessage }),
      });
      if (!res.ok) throw new Error(await fetchErrorMessage(res));
    });
  }

  async function sendDelegateCommand() {
    if (!selectedAgent) return;
    const v = validateInputs({ requireTaskLabel: true });
    if (!v) return;
    await onAction("Delegate", async () => {
      const res = await fetch(`/api/agents/${selectedAgent.id}/delegate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: v.trimmedMessage, taskLabel: v.normalizedTaskLabel }),
      });
      if (!res.ok) throw new Error(await fetchErrorMessage(res));
    });
  }

  async function sendSessionMessage() {
    if (!selectedAgent) return;
    const v = validateInputs();
    if (!v) return;
    await onAction("Session Send", async () => {
      const res = await fetch("/api/gateway/sessions/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: "hermes", to: selectedAgent.id, message: v.trimmedMessage }),
      });
      if (!res.ok) throw new Error(await fetchErrorMessage(res));
    });
  }

  async function spawnSessionTask() {
    if (!selectedAgent) return;
    const v = validateInputs({ requireTaskLabel: true });
    if (!v) return;
    await onAction("Session Spawn", async () => {
      const res = await fetch("/api/gateway/sessions/spawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: "hermes", to: selectedAgent.id, task: v.normalizedTaskLabel, message: v.trimmedMessage }),
      });
      if (!res.ok) throw new Error(await fetchErrorMessage(res));
    });
  }

  return (
    <article className="vulcan-card p-4">
      <div className="mb-4">
        <h2 className="section-title">에이전트 제어 패널</h2>
        <p className="mt-1 caption-text">실행 제어는 여기서, 에이전트 상태 모니터링은 오른쪽 roster에서 확인</p>
      </div>

      {/* Selected agent info */}
      {selectedAgent && (
        <div className="mb-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--color-foreground)]">{selectedAgent.name}</p>
            <Badge status={statusBadgeMap[selectedAgent.status]} dot>
              {STATUS_LABELS[selectedAgent.status]}
            </Badge>
          </div>
          <p className="text-xs text-[var(--color-muted-foreground)]">{selectedAgent.mission}</p>
          <p className="mt-1 caption-text">
            구역: {OFFICE_ZONES[selectedAgent.status]} · 활성: {isInactive ? "아니오" : "예"} · 일시정지: {isPaused ? "예" : "아니오"}
          </p>
        </div>
      )}

      {/* Form */}
      <div className="space-y-3">
        <div>
          <label htmlFor={`${fieldId}-agent`} className="mb-1 block caption-text">대상 에이전트</label>
          <select id={`${fieldId}-agent`} value={selectedAgentId} onChange={(e) => onSelectAgent(e.target.value)} className="vulcan-input w-full">
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} {a.isActive === false ? "(비활성)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${fieldId}-msg`} className="mb-1 block caption-text">메시지</label>
          <textarea id={`${fieldId}-msg`} value={message} onChange={(e) => setMessage(e.target.value)} className="vulcan-input min-h-[96px] w-full resize-y" />
        </div>
        <div>
          <label htmlFor={`${fieldId}-label`} className="mb-1 block caption-text">태스크 레이블</label>
          <input
            id={`${fieldId}-label`}
            value={taskLabel}
            onChange={(e) => setTaskLabel(e.target.value)}
            onBlur={() => setTaskLabel((prev) => normalizeTaskLabel(prev))}
            className="vulcan-input w-full"
          />
          <p className="mt-1 text-[11px] text-[var(--color-tertiary)]">예: `status-check` (a-z, 0-9, -, _)</p>
        </div>
      </div>

      {/* Command Actions */}
      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-tertiary)]">커맨드 액션</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" size="md" disabled={disabled} onClick={() => void sendDirectCommand()}>직접 커맨드</Button>
          <Button variant="secondary" size="md" disabled={disabled} onClick={() => void sendDelegateCommand()}>Hermes 위임</Button>
        </div>
      </div>

      {/* Session Actions */}
      <div className="mt-3 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-tertiary)]">세션 액션</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" size="md" disabled={disabled} onClick={() => void sendSessionMessage()}>세션 전송</Button>
          <Button variant="secondary" size="md" disabled={disabled} onClick={() => void spawnSessionTask()}>세션 생성</Button>
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-[var(--color-destructive-text)]">{error}</p>}
    </article>
  );
}
