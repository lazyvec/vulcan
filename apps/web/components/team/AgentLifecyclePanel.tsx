"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { Agent } from "@/lib/types";

interface AgentLifecyclePanelProps {
  selectedAgent: Agent | null;
  isInactive: boolean;
  isPaused: boolean;
  busyAction: string | null;
  onAction: (label: string, action: () => Promise<void>) => Promise<void>;
}

async function fetchErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as { error?: string };
    if (data?.error) return `${response.status}: ${data.error}`;
  } catch { /* ignore */ }
  return `${response.status}: request failed`;
}

type ConfirmAction = { label: string; message: string; action: () => Promise<void> };

export function AgentLifecyclePanel({ selectedAgent, isInactive, isPaused, busyAction, onAction }: AgentLifecyclePanelProps) {
  const busy = Boolean(busyAction);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);

  function requestConfirm(label: string, message: string, action: () => Promise<void>) {
    setConfirm({ label, message, action });
  }

  async function executeConfirm() {
    if (!confirm) return;
    setConfirm(null);
    await onAction(confirm.label, confirm.action);
  }

  return (
    <div className="space-y-2">
      <h3 className="section-title">생명주기 액션</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="secondary" disabled={!selectedAgent || isInactive || isPaused || busy} onClick={() => {
          if (!selectedAgent) return;
          requestConfirm("일시정지", `${selectedAgent.name}을(를) 일시정지할까요?`, async () => {
            const res = await fetch(`/api/agents/${selectedAgent.id}/pause`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
            if (!res.ok) throw new Error(await fetchErrorMessage(res));
          });
        }}>일시정지</Button>
        <Button variant="secondary" disabled={!selectedAgent || isInactive || !isPaused || busy} onClick={() => {
          if (!selectedAgent) return;
          requestConfirm("재개", `${selectedAgent.name}을(를) 재개할까요?`, async () => {
            const res = await fetch(`/api/agents/${selectedAgent.id}/resume`, { method: "POST" });
            if (!res.ok) throw new Error(await fetchErrorMessage(res));
          });
        }}>재개</Button>
        <Button variant="destructive" disabled={!selectedAgent || isInactive || busy} onClick={() => {
          if (!selectedAgent) return;
          requestConfirm("비활성화", `${selectedAgent.name}을(를) 비활성화할까요? 이 작업은 에이전트를 중지시킵니다.`, async () => {
            const res = await fetch(`/api/agents/${selectedAgent.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error(await fetchErrorMessage(res));
          });
        }}>비활성화</Button>
        <Button variant="secondary" disabled={!selectedAgent || !isInactive || busy} onClick={() => {
          if (!selectedAgent) return;
          requestConfirm("재활성화", `${selectedAgent.name}을(를) 재활성화할까요?`, async () => {
            const res = await fetch(`/api/agents/${selectedAgent.id}`, {
              method: "PUT", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ isActive: true, status: "idle" }),
            });
            if (!res.ok) throw new Error(await fetchErrorMessage(res));
          });
        }}>재활성화</Button>
      </div>

      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm?.label ?? "확인"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>취소</Button>
            <Button variant={confirm?.label === "비활성화" ? "destructive" : "primary"} onClick={() => void executeConfirm()}>확인</Button>
          </>
        }
      >
        <p className="body-text">{confirm?.message}</p>
      </Modal>
    </div>
  );
}
