"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";
import { ActivityDashboard } from "@/components/ActivityDashboard";
import { NotificationSettings } from "@/components/NotificationSettings";
import { ApprovalsPanel } from "@/components/ApprovalsPanel";
import { Tabs } from "@/components/ui/Tabs";
import type { ActivityStats, Agent, EventItem, Approval, ApprovalPolicy, NotificationPreference } from "@/lib/types";

type SubTab = "dashboard" | "notifications" | "approvals";

interface Props {
  initialStats: ActivityStats;
  initialEvents: EventItem[];
  initialTotal: number;
  agents: Agent[];
  notificationPrefs: NotificationPreference | null;
  approvals: Approval[];
  policies: ApprovalPolicy[];
  pendingCount: number;
  deepLinkAction?: string;
  deepLinkId?: string;
}

export function ActivityPageClient({
  initialStats,
  initialEvents,
  initialTotal,
  agents,
  notificationPrefs,
  approvals,
  policies,
  pendingCount,
  deepLinkAction,
  deepLinkId,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = (searchParams.get("tab") as SubTab) || "dashboard";

  const handleTabChange = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (key === "dashboard") {
        params.delete("tab");
      } else {
        params.set("tab", key);
      }
      params.delete("action");
      params.delete("id");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const tabItems = [
    { key: "dashboard", label: "대시보드" },
    { key: "notifications", label: "알림" },
    { key: "approvals", label: "승인", count: pendingCount },
  ] as const;

  return (
    <div className="space-y-4">
      <Tabs items={[...tabItems]} activeKey={activeTab} onChange={handleTabChange} />
      {activeTab === "dashboard" && (
        <ActivityDashboard
          initialStats={initialStats}
          initialEvents={initialEvents}
          initialTotal={initialTotal}
          agents={agents}
        />
      )}
      {activeTab === "notifications" && (
        <NotificationSettings initialPreferences={notificationPrefs} />
      )}
      {activeTab === "approvals" && (
        <ApprovalsPanel
          initialApprovals={approvals}
          initialPolicies={policies}
          deepLinkAction={deepLinkAction}
          deepLinkId={deepLinkId}
        />
      )}
    </div>
  );
}
