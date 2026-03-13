import { getDailyCostSummaries, getCircuitBreakerConfigs } from "@/lib/api-server";
import { CostDashboard } from "@/components/CostDashboard";

export const dynamic = "force-dynamic";

export default async function CostsPage() {
  const [summaries, cbConfigs] = await Promise.all([
    getDailyCostSummaries(),
    getCircuitBreakerConfigs(),
  ]);

  return <CostDashboard summaries={summaries} cbConfigs={cbConfigs} />;
}
