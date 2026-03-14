import {
  getAgents,
  getWorkOrders,
  getDailyCostSummaries,
  getSkills,
  getSkillRegistry,
} from "@/lib/api-server";
import { TeamPageClient } from "./client";
import type { WorkOrder } from "@vulcan/shared/types";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const [agents, workOrdersData, costSummaries, skills, registry] = await Promise.all([
    getAgents({ includeInactive: true }),
    getWorkOrders({ status: "in_progress", limit: 50 }),
    getDailyCostSummaries(undefined, 1),
    getSkills(),
    getSkillRegistry(),
  ]);

  // 에이전트별 현재 WorkOrder 매핑
  const agentWorkOrders: Record<string, WorkOrder | null> = {};
  for (const agent of agents) {
    agentWorkOrders[agent.id] =
      workOrdersData.workOrders.find((wo) => wo.toAgentId === agent.id) ?? null;
  }

  // 에이전트별 오늘 토큰 소비 합산
  const agentTokenUsage: Record<string, number> = {};
  for (const s of costSummaries) {
    agentTokenUsage[s.agentId] =
      (agentTokenUsage[s.agentId] ?? 0) + s.totalInputTokens + s.totalOutputTokens;
  }

  return (
    <TeamPageClient
      agents={agents}
      agentWorkOrders={agentWorkOrders}
      agentTokenUsage={agentTokenUsage}
      skills={skills}
      registry={registry}
    />
  );
}
