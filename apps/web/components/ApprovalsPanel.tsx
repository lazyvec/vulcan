"use client";

import { useCallback, useEffect, useState } from "react";
import type { Approval, ApprovalPolicy } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { approvalStatusColorMap } from "@/lib/ui-utils";

type Tab = "pending" | "history" | "policies";

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

const modeLabelMap: Record<string, string> = {
  delegate: "위임",
  direct: "직접",
};

export function ApprovalsPanel({ initialApprovals, initialPolicies, deepLinkAction, deepLinkId }: Props) {
  const [tab, setTab] = useState<Tab>("pending");
  const [approvals, setApprovals] = useState(initialApprovals);
  const [policies, setPolicies] = useState(initialPolicies);
  const [resolving, setResolving] = useState<string | null>(null);
  const { toast } = useToast();

  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<ApprovalPolicy | null>(null);
  const [policyForm, setPolicyForm] = useState({
    name: "", description: "", matchAgentId: "", matchMode: "", matchCommandPattern: "", autoApproveMinutes: "", isActive: true,
  });

  const pendingApprovals = approvals.filter((a) => a.status === "pending");
  const historyApprovals = approvals.filter((a) => a.status !== "pending");

  const refreshApprovals = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/approvals?limit=100`);
      const data = await res.json();
      if (data.approvals) setApprovals(data.approvals);
    } catch { /* ignore */ }
  }, []);

  const refreshPolicies = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/approval-policies`);
      const data = await res.json();
      if (data.policies) setPolicies(data.policies);
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

  function resetPolicyForm(policy?: ApprovalPolicy) {
    if (policy) {
      setEditingPolicy(policy);
      setPolicyForm({
        name: policy.name, description: policy.description, matchAgentId: policy.matchAgentId ?? "",
        matchMode: policy.matchMode ?? "", matchCommandPattern: policy.matchCommandPattern ?? "",
        autoApproveMinutes: policy.autoApproveMinutes?.toString() ?? "", isActive: policy.isActive,
      });
    } else {
      setEditingPolicy(null);
      setPolicyForm({ name: "", description: "", matchAgentId: "", matchMode: "", matchCommandPattern: "", autoApproveMinutes: "", isActive: true });
    }
    setShowPolicyForm(true);
  }

  async function handleSavePolicy() {
    const body: Record<string, unknown> = {
      name: policyForm.name, description: policyForm.description || undefined,
      matchAgentId: policyForm.matchAgentId || null, matchMode: policyForm.matchMode || null,
      matchCommandPattern: policyForm.matchCommandPattern || null,
      autoApproveMinutes: policyForm.autoApproveMinutes ? Number(policyForm.autoApproveMinutes) : null,
      isActive: policyForm.isActive,
    };
    try {
      const url = editingPolicy ? `${API_BASE}/approval-policies/${editingPolicy.id}` : `${API_BASE}/approval-policies`;
      const method = editingPolicy ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) {
        toast("success", editingPolicy ? "정책 수정됨" : "정책 생성됨");
        setShowPolicyForm(false);
        await refreshPolicies();
      } else {
        toast("error", data.error ?? "저장 실패");
      }
    } catch {
      toast("error", "네트워크 오류");
    }
  }

  return (
    <div className="space-y-4">
      <Tabs
        items={[
          { key: "pending", label: "대기 중", count: pendingApprovals.length },
          { key: "history", label: "처리 이력" },
          { key: "policies", label: "정책 관리" },
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
        </div>
      )}

      {/* History */}
      {tab === "history" && (
        <div className="space-y-2">
          {historyApprovals.length === 0 && <EmptyState message="처리 이력 없음" />}
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
      )}

      {/* Policies */}
      {tab === "policies" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="primary" size="md" onClick={() => resetPolicyForm()}>정책 추가</Button>
          </div>

          {showPolicyForm && (
            <div className="vulcan-card space-y-3 p-4">
              <h3 className="section-title">{editingPolicy ? "정책 수정" : "새 정책"}</h3>
              <input className="vulcan-input w-full" placeholder="정책 이름" value={policyForm.name} onChange={(e) => setPolicyForm((p) => ({ ...p, name: e.target.value }))} />
              <input className="vulcan-input w-full" placeholder="설명 (선택)" value={policyForm.description} onChange={(e) => setPolicyForm((p) => ({ ...p, description: e.target.value }))} />
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <input className="vulcan-input" placeholder="에이전트 ID (선택)" value={policyForm.matchAgentId} onChange={(e) => setPolicyForm((p) => ({ ...p, matchAgentId: e.target.value }))} />
                <select className="vulcan-input" value={policyForm.matchMode} onChange={(e) => setPolicyForm((p) => ({ ...p, matchMode: e.target.value }))}>
                  <option value="">모드 (전체)</option>
                  <option value="delegate">위임</option>
                  <option value="direct">직접</option>
                </select>
                <input className="vulcan-input" placeholder="커맨드 패턴 regex (선택)" value={policyForm.matchCommandPattern} onChange={(e) => setPolicyForm((p) => ({ ...p, matchCommandPattern: e.target.value }))} />
                <input className="vulcan-input" placeholder="자동 승인 (분)" type="number" value={policyForm.autoApproveMinutes} onChange={(e) => setPolicyForm((p) => ({ ...p, autoApproveMinutes: e.target.value }))} />
              </div>
              <label className="flex items-center gap-2 text-sm text-[var(--color-foreground)]">
                <input type="checkbox" checked={policyForm.isActive} onChange={(e) => setPolicyForm((p) => ({ ...p, isActive: e.target.checked }))} />
                활성화
              </label>
              <div className="flex gap-2">
                <Button variant="primary" onClick={handleSavePolicy}>저장</Button>
                <Button variant="secondary" onClick={() => setShowPolicyForm(false)}>취소</Button>
              </div>
            </div>
          )}

          {policies.length === 0 && !showPolicyForm && <EmptyState message="등록된 정책 없음" />}
          {policies.map((p) => (
            <div key={p.id} className="vulcan-card p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--color-foreground)]">
                    {p.name}
                    {!p.isActive && <span className="ml-2 caption-text">(비활성)</span>}
                  </p>
                  <p className="caption-text">
                    {p.matchAgentId && <>에이전트: {p.matchAgentId} · </>}
                    {p.matchMode && <>모드: {modeLabelMap[p.matchMode] ?? p.matchMode} · </>}
                    {p.matchCommandPattern && <>패턴: {p.matchCommandPattern} · </>}
                    {p.autoApproveMinutes && <>{p.autoApproveMinutes}분 자동승인</>}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => resetPolicyForm(p)}>수정</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
