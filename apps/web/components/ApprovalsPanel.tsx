"use client";

import { useCallback, useEffect, useState } from "react";
import type { Approval, ApprovalPolicy } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { approvalStatusColorMap } from "@/lib/ui-utils";

type Tab = "pending" | "settings";

interface Props {
  initialApprovals: Approval[];
  initialPolicies: ApprovalPolicy[];
  deepLinkAction?: string;
  deepLinkId?: string;
}

const API_BASE = "/api";

const statusLabelMap: Record<string, string> = {
  pending: "대기",
  approved: "승인됨",
  rejected: "거절됨",
  auto_approved: "자동 승인",
  expired: "만료됨",
};

export function ApprovalsPanel({ initialApprovals, initialPolicies, deepLinkAction, deepLinkId }: Props) {
  const [tab, setTab] = useState<Tab>("pending");
  const [approvals, setApprovals] = useState(initialApprovals);
  const [policies, setPolicies] = useState(initialPolicies);
  const [resolving, setResolving] = useState<string | null>(null);
  const { toast } = useToast();

  const pendingApprovals = approvals.filter((a) => a.status === "pending");
  const historyApprovals = approvals.filter((a) => a.status !== "pending");

  const refreshApprovals = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/approvals?limit=100`);
      const data = await res.json();
      if (data.approvals) setApprovals(data.approvals);
    } catch { /* ignore */ }
  }, []);

  const handleResolve = useCallback(async (id: string, action: "approve" | "reject", reason?: string) => {
    setResolving(id);
    try {
      const res = await fetch(`${API_BASE}/approvals/${id}/resolve`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (res.ok) {
        toast("success", action === "approve" ? "승인됨" : "거절됨");
        await refreshApprovals();
      } else {
        toast("error", data.error ?? "처리 실패");
      }
    } catch {
      toast("error", "네트워크 오류");
    } finally {
      setResolving(null);
    }
  }, [refreshApprovals, toast]);

  useEffect(() => {
    if (deepLinkAction && deepLinkId && (deepLinkAction === "approve" || deepLinkAction === "reject")) {
      void handleResolve(deepLinkId, deepLinkAction as "approve" | "reject");
    }
  }, [deepLinkAction, deepLinkId, handleResolve]);

  // 자동승인 토글: 첫 번째 정책의 autoApproveMinutes 기반
  const firstPolicy = policies[0] ?? null;
  const autoApproveEnabled = firstPolicy?.autoApproveMinutes != null && firstPolicy.autoApproveMinutes > 0;

  async function toggleAutoApprove() {
    if (!firstPolicy) return;
    const newMinutes = autoApproveEnabled ? null : 5;
    try {
      const res = await fetch(`${API_BASE}/approval-policies/${firstPolicy.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoApproveMinutes: newMinutes }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.policy) {
          setPolicies((prev) => prev.map((p) => (p.id === firstPolicy.id ? data.policy : p)));
        }
        toast("success", newMinutes ? "자동승인 활성화" : "자동승인 비활성화");
      }
    } catch {
      toast("error", "설정 변경 실패");
    }
  }

  return (
    <div className="space-y-4">
      <Tabs
        items={[
          { key: "pending", label: "대기 중", count: pendingApprovals.length },
          { key: "settings", label: "설정" },
        ]}
        activeKey={tab}
        onChange={(key) => setTab(key as Tab)}
      />

      {/* Pending */}
      {tab === "pending" && (
        <div className="space-y-3">
          {pendingApprovals.length === 0 && <EmptyState message="대기 중인 승인 없음" />}
          {pendingApprovals.map((a) => (
            <div key={a.id} className="vulcan-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--color-foreground)]">
                    <span className="font-medium">커맨드:</span> {a.agentCommandId.slice(0, 8)}…
                  </p>
                  <p className="caption-text">
                    정책: {a.policyId.slice(0, 8)}… · 요청: {new Date(a.createdAt).toLocaleString("ko-KR")}
                    {a.expiresAt && <> · 만료: {new Date(a.expiresAt).toLocaleString("ko-KR")}</>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" disabled={resolving === a.id} onClick={() => handleResolve(a.id, "approve")}>승인</Button>
                  <Button variant="destructive" size="sm" disabled={resolving === a.id} onClick={() => handleResolve(a.id, "reject")}>거절</Button>
                </div>
              </div>
            </div>
          ))}

          {/* 처리 이력 (접힘) */}
          {historyApprovals.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
                처리 이력 ({historyApprovals.length})
              </summary>
              <div className="mt-2 space-y-2">
                {historyApprovals.map((a) => (
                  <div key={a.id} className="vulcan-card p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[var(--color-foreground)]">{a.agentCommandId.slice(0, 8)}…</p>
                        <p className="caption-text">
                          {new Date(a.updatedAt).toLocaleString("ko-KR")}
                          {a.resolvedReason && <> · {a.resolvedReason}</>}
                        </p>
                      </div>
                      <Badge status={approvalStatusColorMap[a.status] ?? "neutral"}>{statusLabelMap[a.status] ?? a.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Settings */}
      {tab === "settings" && (
        <div className="vulcan-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-foreground)]">자동 승인</h3>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {autoApproveEnabled ? `${firstPolicy?.autoApproveMinutes}분 후 자동 승인` : "수동 승인만"}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleAutoApprove}
              disabled={!firstPolicy}
              className={`rounded-[var(--radius-control)] px-4 py-2 min-h-[44px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                autoApproveEnabled
                  ? "bg-[var(--color-primary)] text-white"
                  : "border border-[var(--color-border)] text-[var(--color-muted-foreground)]"
              }`}
            >
              {autoApproveEnabled ? "ON" : "OFF"}
            </button>
          </div>

          {/* 정책 목록 (읽기 전용) */}
          {policies.length > 0 && (
            <div className="border-t border-[var(--color-border)] pt-4">
              <h4 className="mb-2 text-xs font-semibold text-[var(--color-muted-foreground)]">정책 ({policies.length})</h4>
              <div className="space-y-1.5">
                {policies.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-md bg-[var(--color-surface)] px-3 py-2 text-sm">
                    <span className="text-[var(--color-foreground)]">
                      {p.name}
                      {!p.isActive && <span className="ml-1 text-xs text-[var(--color-muted-foreground)]">(비활성)</span>}
                    </span>
                    {p.autoApproveMinutes && (
                      <span className="text-xs text-[var(--color-muted-foreground)]">{p.autoApproveMinutes}분</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
