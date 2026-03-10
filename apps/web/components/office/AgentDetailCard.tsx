"use client";

import { OFFICE_ZONES, STATUS_LABELS } from "@/lib/statusMap";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { statusBadgeMap } from "@/lib/ui-utils";
import type { Agent } from "@/lib/types";

interface AgentDetailCardProps {
  agent: Agent | null;
}

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function AgentDetailCard({ agent }: AgentDetailCardProps) {
  return (
    <article className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="section-title">선택된 에이전트</h3>
        {agent && (
          <Badge status={statusBadgeMap[agent.status]} dot>{STATUS_LABELS[agent.status]}</Badge>
        )}
      </div>
      {agent ? (
        <>
          <p className="text-sm font-semibold text-[var(--color-foreground)]">{agent.name}</p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{agent.mission}</p>
          <p className="mt-2 caption-text">구역: {OFFICE_ZONES[agent.status]}</p>
          <p className="caption-text">마지막 활동: {formatDateTime(agent.lastSeenAt)}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {agent.roleTags.map((tag) => (
              <span key={tag} className="vulcan-chip text-[11px]">{tag}</span>
            ))}
          </div>
        </>
      ) : (
        <EmptyState message="에이전트를 선택해주세요" className="py-4" />
      )}
    </article>
  );
}
