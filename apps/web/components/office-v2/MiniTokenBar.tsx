"use client";

import { useMemo } from "react";
import type { Agent } from "@/lib/types";
import { getSpriteConfig } from "./sprite-map";

interface MiniTokenBarProps {
  agents: Agent[];
  agentTokenUsage: Record<string, number>;
}

export function MiniTokenBar({ agents, agentTokenUsage }: MiniTokenBarProps) {
  const segments = useMemo(() => {
    const items = agents
      .filter((a) => (agentTokenUsage[a.id] ?? 0) > 0)
      .map((a) => ({
        agent: a,
        tokens: agentTokenUsage[a.id] ?? 0,
        sprite: getSpriteConfig(a),
      }))
      .sort((a, b) => b.tokens - a.tokens);

    const total = items.reduce((sum, s) => sum + s.tokens, 0);
    return { items, total };
  }, [agents, agentTokenUsage]);

  if (segments.total === 0) return null;

  return (
    <div className="rounded-xl border border-glass-border bg-[var(--color-surface)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">
          Token Usage (Today)
        </span>
        <span className="text-xs font-black text-[var(--color-foreground)]">
          {segments.total.toLocaleString()}
        </span>
      </div>

      {/* 스택 바 */}
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--color-background)]"
        role="img"
        aria-label="에이전트별 토큰 사용량 분포"
      >
        {segments.items.map((seg) => {
          const pct = (seg.tokens / segments.total) * 100;
          if (pct < 1) return null;
          return (
            <div
              key={seg.agent.id}
              className="h-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                backgroundColor: seg.sprite.primaryColor,
                opacity: 0.8,
              }}
              aria-label={`${seg.agent.name}: ${pct.toFixed(0)}% (${seg.tokens.toLocaleString()} 토큰)`}
            />
          );
        })}
      </div>

      {/* 범례 (바에 표시되는 1%+ 세그먼트만) */}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {segments.items
          .filter((seg) => (seg.tokens / segments.total) * 100 >= 1)
          .slice(0, 5)
          .map((seg) => (
            <div key={seg.agent.id} className="flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full"
                aria-hidden="true"
                style={{ backgroundColor: seg.sprite.primaryColor }}
              />
              <span className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                {seg.agent.name}
              </span>
              <span className="text-[10px] font-bold text-[var(--color-muted-foreground)]">
                {((seg.tokens / segments.total) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
