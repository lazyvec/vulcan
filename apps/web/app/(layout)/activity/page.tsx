import {
  getActivityEvents,
  getActivityStats,
  getAgents,
  getNotificationPreferences,
  getApprovals,
  getApprovalPolicies,
} from "@/lib/api-server";
import { ActivityPageClient } from "./client";

export const dynamic = "force-dynamic";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; action?: string; id?: string }>;
}) {
  const params = await searchParams;

  const [stats, activityData, agents, notifPrefs, approvals, policies] =
    await Promise.all([
      getActivityStats(),
      getActivityEvents({ limit: 50 }),
      getAgents(),
      getNotificationPreferences().catch(() => null),
      getApprovals({ limit: 100 }).catch(() => []),
      getApprovalPolicies().catch(() => []),
    ]);

  const pendingCount = Array.isArray(approvals)
    ? approvals.filter((a) => a.status === "pending").length
    : 0;

  return (
    <ActivityPageClient
      initialStats={stats}
      initialEvents={activityData.events}
      initialTotal={activityData.total}
      agents={agents}
      notificationPrefs={notifPrefs}
      approvals={approvals}
      policies={policies}
      pendingCount={pendingCount}
      deepLinkAction={params.action}
      deepLinkId={params.id}
    />
  );
}
