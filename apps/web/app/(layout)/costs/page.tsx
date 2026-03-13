import { getDailyCostSummaries, getCircuitBreakerConfigs, getCBHistory } from "@/lib/api-server";
import { CostDashboard } from "@/components/CostDashboard";

export const dynamic = "force-dynamic";

export default async function CostsPage() {
  const [summaries, cbConfigs, cbHistory] = await Promise.all([
    getDailyCostSummaries(undefined, 7),
    getCircuitBreakerConfigs(),
    getCBHistory(),
  ]);

  return <CostDashboard summaries={summaries} cbConfigs={cbConfigs} cbHistory={cbHistory} />;
}
