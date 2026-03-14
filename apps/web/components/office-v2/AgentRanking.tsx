"use client";

import { useMemo } from "react";
import type { Agent, WorkOrder } from "@/lib/types";
import { getSpriteConfig } from "./sprite-map";
import { PixelAvatar } from "./PixelAvatar";
import { xpToLevel } from "./constants";

interface AgentRankingProps {
  agents: Agent[];
  agentTokenUsage: Record<string, number>;
  agentWorkOrders: Record<string, WorkOrder | null>;
}

const RANK_BADGES = ["🥇", "🥈", "🥉"];

export function AgentRanking({
  agents,
  agentTokenUsage,
  agentWorkOrders,
}: AgentRankingProps) {
  const rankings = useMemo(() => {
    return agents
      .filter((a) => a.isActive !== false)
      .map((agent) => {
        const sprite = getSpriteConfig(agent);
        const tokens = agentTokenUsage[agent.id] ?? 0;
        const hasWork = agentWorkOrders[agent.id] != null ? 1 : 0;
        // XP: 활성 작업 * 100 + 토큰 * 0.001
        const xp = hasWork * 100 + tokens * 0.001;
        const { level, progress } = xpToLevel(Math.floor(xp));
        return { agent, sprite, xp: Math.floor(xp), level, progress, tokens };
      })
      .sort((a, b) => b.xp - a.xp);
  }, [agents, agentTokenUsage, agentWorkOrders]);

  return (
    <div className="rounded-xl border border-glass-border bg-[var(--color-surface)] p-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">
        XP Ranking
      </span>

      <div className="mt-2 space-y-1.5">
        {rankings.map((r, idx) => (
          <div
            key={r.agent.id}
            className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-[var(--color-background)]/40 transition-colors"
          >
            {/* 순위 */}
            <span className="w-5 text-center text-xs" aria-label={`${idx + 1}위`}>
              {idx < 3 ? <span aria-hidden="true">{RANK_BADGES[idx]}</span> : (
                <span className="text-[10px] font-bold text-[var(--color-muted-foreground)]">
                  {idx + 1}
                </span>
              )}
            </span>

            {/* 아바타 */}
            <PixelAvatar
              name={r.sprite.name}
              primaryColor={r.sprite.primaryColor}
              secondaryColor={r.sprite.secondaryColor}
              size={22}
            />

            {/* 이름 + 레벨 */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="truncate text-[11px] font-bold text-[var(--color-foreground)]">
                  {r.agent.name}
                </span>
                <span className="shrink-0 rounded bg-[var(--color-primary-bg)] px-1 text-[8px] font-black text-[var(--color-primary)]">
                  Lv.{r.level}
                </span>
              </div>
              {/* XP 프로그레스 바 */}
              <div className="mt-0.5 flex items-center gap-1">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--color-background)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500"
                    style={{ width: `${r.progress * 100}%` }}
                  />
                </div>
                <span className="text-[8px] font-bold text-[var(--color-muted-foreground)]">
                  {r.xp}
                </span>
              </div>
            </div>
          </div>
        ))}

        {rankings.length === 0 && (
          <p className="py-4 text-center text-[10px] text-[var(--color-muted-foreground)] opacity-40">
            활성 에이전트 없음
          </p>
        )}
      </div>
    </div>
  );
}
