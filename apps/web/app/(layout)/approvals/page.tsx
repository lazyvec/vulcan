import { getApprovalPolicies, getApprovals } from "@/lib/api-server";
import { ApprovalsPanel } from "@/components/ApprovalsPanel";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; id?: string }>;
}) {
  const params = await searchParams;
  const [approvals, policies] = await Promise.all([
    getApprovals({ limit: 100 }).catch(() => []),
    getApprovalPolicies().catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--color-foreground)]">
          Approvals
        </h2>
        <p className="mt-1 text-sm text-[var(--color-tertiary)]">
          커맨드 승인/거절 관리 및 정책 설정
        </p>
      </div>
      <ApprovalsPanel
        initialApprovals={approvals}
        initialPolicies={policies}
        deepLinkAction={params.action}
        deepLinkId={params.id}
      />
    </div>
  );
}
