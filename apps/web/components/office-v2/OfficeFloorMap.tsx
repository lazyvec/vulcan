"use client";

import { useMemo, useState } from "react";
import type { Agent, WorkOrder } from "@/lib/types";
import { useAgentStatus } from "@/hooks/useAgentStatus";
import { useMounted } from "@/hooks/useMounted";
import { FLOOR_ZONES, FLOOR_ZONE_MAP, getAgentPositionInZone } from "./constants";
import { FloorZone } from "./FloorZone";
import { MovingAgent } from "./MovingAgent";
import { OfficeHeader } from "./OfficeHeader";
import { MiniTokenBar } from "./MiniTokenBar";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { AgentRanking } from "./AgentRanking";
import { EventTrail } from "./EventTrail";
import { MemoryTimeline } from "./MemoryTimeline";

interface OfficeFloorMapProps {
  initialAgents: Agent[];
  agentWorkOrders: Record<string, WorkOrder | null>;
  agentTokenUsage: Record<string, number>;
}

export function OfficeFloorMap({
  initialAgents,
  agentWorkOrders: initialWorkOrders,
  agentTokenUsage: initialTokenUsage,
}: OfficeFloorMapProps) {
  const mounted = useMounted();
  const { agents, agentWorkOrders, agentTokenUsage, wsConnected } = useAgentStatus({
    initialAgents,
    initialWorkOrders,
    initialTokenUsage,
  });
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  // 존별 에이전트 그룹핑
  const agentsByZone = useMemo(() => {
    const map: Record<string, Agent[]> = {};
    for (const zone of FLOOR_ZONES) map[zone.id] = [];
    for (const agent of agents) {
      if (agent.isActive === false) continue;
      (map[agent.status] ??= []).push(agent);
    }
    return map;
  }, [agents]);

  // 각 에이전트의 바닥맵 좌표 계산
  const agentPositions = useMemo(() => {
    const positions: Record<string, { left: number; top: number }> = {};
    for (const [zoneId, zoneAgents] of Object.entries(agentsByZone)) {
      const zone = FLOOR_ZONE_MAP[zoneId as keyof typeof FLOOR_ZONE_MAP];
      if (!zone) continue;
      zoneAgents.forEach((agent, idx) => {
        positions[agent.id] = getAgentPositionInZone(idx, zoneAgents.length, zone);
      });
    }
    return positions;
  }, [agentsByZone]);

  // 비활성 에이전트
  const inactiveAgents = useMemo(
    () => agents.filter((a) => a.isActive === false),
    [agents],
  );

  const activeCount = useMemo(
    () => agents.filter((a) => a.status !== "idle" && a.isActive !== false).length,
    [agents],
  );

  return (
    <div className="space-y-4">
      <OfficeHeader
        totalAgents={agents.length}
        activeCount={activeCount}
        wsConnected={wsConnected}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        {/* 메인 영역 */}
        <div className="space-y-4">
          {/* 바닥맵 */}
          <div
            role="application"
            aria-label="에이전트 오피스 바닥맵"
            className="relative w-full rounded-2xl border border-glass-border bg-[var(--color-surface)]"
            style={{ aspectRatio: "16 / 9" }}
          >
            {/* 바닥 패턴 */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  "linear-gradient(var(--color-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)",
                backgroundSize: "6.25% 6.25%",
              }}
            />

            {/* 6개 존 배경 */}
            {FLOOR_ZONES.map((zone) => (
              <FloorZone
                key={zone.id}
                zone={zone}
                agentCount={agentsByZone[zone.id]?.length ?? 0}
              />
            ))}

            {/* 에이전트 스프라이트 (바닥맵 직접 자식) */}
            {mounted &&
              agents
                .filter((a) => a.isActive !== false && agentPositions[a.id])
                .map((agent) => (
                  <MovingAgent
                    key={agent.id}
                    agent={agent}
                    position={agentPositions[agent.id]}
                    workOrder={agentWorkOrders[agent.id] ?? null}
                    tokenUsage={agentTokenUsage[agent.id] ?? 0}
                    isSelected={selectedAgentId === agent.id}
                    onSelect={() =>
                      setSelectedAgentId((prev) =>
                        prev === agent.id ? null : agent.id,
                      )
                    }
                    onClose={() => setSelectedAgentId(null)}
                  />
                ))}

            {/* 비활성 에이전트 표시 */}
            {inactiveAgents.length > 0 && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg border border-glass-border bg-[var(--color-background)]/80 px-2 py-1 backdrop-blur-sm">
                <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-tertiary)] opacity-50">
                  OFFLINE {inactiveAgents.length}
                </span>
              </div>
            )}
          </div>

          {/* 토큰 바 */}
          <MiniTokenBar agents={agents} agentTokenUsage={agentTokenUsage} />

          {/* 히트맵 */}
          <ActivityHeatmap />
        </div>

        {/* 사이드 패널 */}
        <aside aria-label="에이전트 사이드 패널" className="space-y-4 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
          <AgentRanking
            agents={agents}
            agentTokenUsage={agentTokenUsage}
            agentWorkOrders={agentWorkOrders}
          />
          <EventTrail />
          <MemoryTimeline />
        </aside>
      </div>
    </div>
  );
}
