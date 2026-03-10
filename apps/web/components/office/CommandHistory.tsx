"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { commandStatusColorMap } from "@/lib/ui-utils";
import type { AgentCommand } from "@/lib/types";

interface CommandHistoryProps {
  agentId: string;
}

const COMMAND_STATUS_LABELS: Record<AgentCommand["status"], string> = {
  queued: "대기 중",
  sent: "전송됨",
  failed: "실패",
  pending_approval: "승인 대기",
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function CommandHistory({ agentId }: CommandHistoryProps) {
  const [commands, setCommands] = useState<AgentCommand[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const loadCommands = useCallback(async (id: string) => {
    if (!id) { setCommands([]); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/agent-commands?agentId=${encodeURIComponent(id)}&limit=20`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = (await res.json()) as { commands?: AgentCommand[] };
      setCommands(Array.isArray(data.commands) ? data.commands : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
      setCommands([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadCommands(agentId); }, [agentId, loadCommands]);

  async function retryCommand(commandId: string) {
    setRetryingId(commandId); setError(null);
    try {
      const res = await fetch(`/api/agent-commands/${commandId}/retry`, { method: "POST" });
      if (!res.ok) throw new Error(`${res.status}`);
      await loadCommands(agentId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "retry failed");
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <article className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="caption-text font-medium">최근 커맨드 ({agentId || "없음"})</p>
        <Button variant="secondary" size="sm" onClick={() => void loadCommands(agentId)} disabled={loading} loading={loading}>
          갱신
        </Button>
      </div>

      {error && <p className="mb-2 text-xs text-[var(--color-destructive-text)]">{error}</p>}

      <div className="space-y-2">
        {commands.map((cmd) => (
          <article key={cmd.id} className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="truncate text-xs font-medium text-[var(--color-foreground)]">
                {cmd.mode === "delegate" ? "Hermes 위임" : "직접 커맨드"}
              </p>
              <Badge status={commandStatusColorMap[cmd.status]}>{COMMAND_STATUS_LABELS[cmd.status]}</Badge>
            </div>
            <p className="caption-text">{formatTime(cmd.createdAt)} · {cmd.id}</p>
            {cmd.error && <p className="mt-1 line-clamp-2 text-[11px] text-[var(--color-destructive-text)]">{cmd.error}</p>}
            {cmd.status === "failed" && (
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() => void retryCommand(cmd.id)}
                disabled={retryingId === cmd.id}
                loading={retryingId === cmd.id}
              >
                재시도
              </Button>
            )}
          </article>
        ))}
        {!loading && commands.length === 0 && (
          <EmptyState message="커맨드 이력이 없습니다." className="py-4" />
        )}
      </div>
    </article>
  );
}
