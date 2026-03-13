import { AgentOfficeView } from "@/components/AgentOfficeView";
import { getAgents, getDailyCostSummaries, getWorkOrders } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export default async function OfficePage() {
  const [agents, workOrdersData, costSummaries] = await Promise.all([
    getAgents(),
    getWorkOrders({ status: "in_progress", limit: 50 }),
    getDailyCostSummaries(undefined, 1),
  ]);

  // 에이전트별 현재 WorkOrder 매핑
  const agentWorkOrders: Record<string, import("@vulcan/shared/types").WorkOrder | null> = {};
  for (const agent of agents) {
    agentWorkOrders[agent.id] =
      workOrdersData.workOrders.find((wo) => wo.toAgentId === agent.id) ?? null;
  }

  // 에이전트별 오늘 토큰 소비 합산
  const agentTokenUsage: Record<string, number> = {};
  for (const s of costSummaries) {
    agentTokenUsage[s.agentId] = (agentTokenUsage[s.agentId] ?? 0) + s.totalInputTokens + s.totalOutputTokens;
  }

  return (
    <AgentOfficeView
      initialAgents={agents}
      agentWorkOrders={agentWorkOrders}
      agentTokenUsage={agentTokenUsage}
    />
  );
}
