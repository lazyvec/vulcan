import { getActivityEvents, getActivityStats, getAgents } from "@/lib/api-server";
import { ActivityDashboard } from "@/components/ActivityDashboard";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const [stats, activityData, agents] = await Promise.all([
    getActivityStats(),
    getActivityEvents({ limit: 50 }),
    getAgents(),
  ]);

  return (
    <ActivityDashboard
      initialStats={stats}
      initialEvents={activityData.events}
      initialTotal={activityData.total}
      agents={agents}
    />
  );
}
