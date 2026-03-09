"use client";

import { useCallback, useEffect, useState } from "react";
import type { Approval, ApprovalPolicy } from "@/lib/types";

type Tab = "pending" | "history" | "policies";

interface Props {
  initialApprovals: Approval[];
  initialPolicies: ApprovalPolicy[];
  deepLinkAction?: string;
  deepLinkId?: string;
}

const API_BASE = "/api";

export function ApprovalsPanel({
  initialApprovals,
  initialPolicies,
  deepLinkAction,
  deepLinkId,
}: Props) {
  const [tab, setTab] = useState<Tab>("pending");
  const [approvals, setApprovals] = useState(initialApprovals);
  const [policies, setPolicies] = useState(initialPolicies);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  // 정책 폼 상태
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<ApprovalPolicy | null>(null);
  const [policyForm, setPolicyForm] = useState({
    name: "",
    description: "",
    matchAgentId: "",
    matchMode: "",
    matchCommandPattern: "",
    autoApproveMinutes: "",
    isActive: true,
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
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/approvals/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "ok", text: action === "approve" ? "승인됨" : "거절됨" });
        await refreshApprovals();
      } else {
        setMessage({ type: "error", text: data.error ?? "처리 실패" });
      }
    } catch {
      setMessage({ type: "error", text: "네트워크 오류" });
    } finally {
      setResolving(null);
    }
  }, [refreshApprovals]);

  // Telegram 딥링크 자동 처리
  useEffect(() => {
    if (deepLinkAction && deepLinkId && (deepLinkAction === "approve" || deepLinkAction === "reject")) {
      void handleResolve(deepLinkId, deepLinkAction as "approve" | "reject");
    }
  }, [deepLinkAction, deepLinkId, handleResolve]);

  function resetPolicyForm(policy?: ApprovalPolicy) {
    if (policy) {
      setEditingPolicy(policy);
      setPolicyForm({
        name: policy.name,
        description: policy.description,
        matchAgentId: policy.matchAgentId ?? "",
        matchMode: policy.matchMode ?? "",
        matchCommandPattern: policy.matchCommandPattern ?? "",
        autoApproveMinutes: policy.autoApproveMinutes?.toString() ?? "",
        isActive: policy.isActive,
      });
    } else {
      setEditingPolicy(null);
      setPolicyForm({
        name: "",
        description: "",
        matchAgentId: "",
        matchMode: "",
        matchCommandPattern: "",
        autoApproveMinutes: "",
        isActive: true,
      });
    }
    setShowPolicyForm(true);
  }

  async function handleSavePolicy() {
    setMessage(null);
    const body: Record<string, unknown> = {
      name: policyForm.name,
      description: policyForm.description || undefined,
      matchAgentId: policyForm.matchAgentId || null,
      matchMode: policyForm.matchMode || null,
      matchCommandPattern: policyForm.matchCommandPattern || null,
      autoApproveMinutes: policyForm.autoApproveMinutes
        ? Number(policyForm.autoApproveMinutes)
        : null,
      isActive: policyForm.isActive,
    };

    try {
      const url = editingPolicy
        ? `${API_BASE}/approval-policies/${editingPolicy.id}`
        : `${API_BASE}/approval-policies`;
      const method = editingPolicy ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "ok", text: editingPolicy ? "정책 수정됨" : "정책 생성됨" });
        setShowPolicyForm(false);
        await refreshPolicies();
      } else {
        setMessage({ type: "error", text: data.error ?? "저장 실패" });
      }
    } catch {
      setMessage({ type: "error", text: "네트워크 오류" });
    }
  }

  const tabClass = (t: Tab) =>
    `cursor-pointer px-4 py-2 text-sm font-medium rounded-t-[var(--radius-control)] transition-colors ${
      tab === t
        ? "bg-[var(--color-surface)] text-[var(--color-foreground)] border-b-2 border-[var(--color-primary)]"
        : "text-[var(--color-tertiary)] hover:text-[var(--color-foreground)]"
    }`;

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={`rounded-[var(--radius-card)] px-4 py-2 text-sm ${
            message.type === "ok"
              ? "bg-green-900/30 text-green-300"
              : "bg-red-900/30 text-red-300"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 탭 */}
      <div className="flex gap-1 border-b border-[var(--color-border)]">
        <button className={tabClass("pending")} onClick={() => setTab("pending")}>
          대기 중 {pendingApprovals.length > 0 && (
            <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs text-white">
              {pendingApprovals.length}
            </span>
          )}
        </button>
        <button className={tabClass("history")} onClick={() => setTab("history")}>
          처리 이력
        </button>
        <button className={tabClass("policies")} onClick={() => setTab("policies")}>
          정책 관리
        </button>
      </div>

      {/* 대기 중 */}
      {tab === "pending" && (
        <div className="space-y-3">
          {pendingApprovals.length === 0 && (
            <p className="py-8 text-center text-sm text-[var(--color-muted-foreground)]">
              대기 중인 승인 없음
            </p>
          )}
          {pendingApprovals.map((a) => (
            <div
              key={a.id}
              className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--color-foreground)]">
                    <span className="font-medium">커맨드:</span> {a.agentCommandId.slice(0, 8)}…
                  </p>
                  <p className="text-xs text-[var(--color-tertiary)]">
                    정책: {a.policyId.slice(0, 8)}… · 요청: {new Date(a.createdAt).toLocaleString("ko-KR")}
                    {a.expiresAt && (
                      <> · 만료: {new Date(a.expiresAt).toLocaleString("ko-KR")}</>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={resolving === a.id}
                    onClick={() => handleResolve(a.id, "approve")}
                    className="rounded-[var(--radius-control)] bg-green-700 px-3 py-1 text-sm text-white hover:bg-green-600 disabled:opacity-50"
                  >
                    승인
                  </button>
                  <button
                    disabled={resolving === a.id}
                    onClick={() => handleResolve(a.id, "reject")}
                    className="rounded-[var(--radius-control)] bg-red-700 px-3 py-1 text-sm text-white hover:bg-red-600 disabled:opacity-50"
                  >
                    거절
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 이력 */}
      {tab === "history" && (
        <div className="space-y-2">
          {historyApprovals.length === 0 && (
            <p className="py-8 text-center text-sm text-[var(--color-muted-foreground)]">
              처리 이력 없음
            </p>
          )}
          {historyApprovals.map((a) => (
            <div
              key={a.id}
              className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-foreground)]">
                    {a.agentCommandId.slice(0, 8)}…
                  </p>
                  <p className="text-xs text-[var(--color-tertiary)]">
                    {new Date(a.updatedAt).toLocaleString("ko-KR")}
                    {a.resolvedReason && <> · {a.resolvedReason}</>}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    a.status === "approved"
                      ? "bg-green-900/30 text-green-300"
                      : a.status === "rejected"
                        ? "bg-red-900/30 text-red-300"
                        : "bg-yellow-900/30 text-yellow-300"
                  }`}
                >
                  {a.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 정책 관리 */}
      {tab === "policies" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => resetPolicyForm()}
              className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2 text-sm text-white hover:opacity-90"
            >
              정책 추가
            </button>
          </div>

          {showPolicyForm && (
            <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3">
              <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
                {editingPolicy ? "정책 수정" : "새 정책"}
              </h3>
              <input
                className="w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)]"
                placeholder="정책 이름"
                value={policyForm.name}
                onChange={(e) => setPolicyForm((p) => ({ ...p, name: e.target.value }))}
              />
              <input
                className="w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)]"
                placeholder="설명 (선택)"
                value={policyForm.description}
                onChange={(e) => setPolicyForm((p) => ({ ...p, description: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="rounded border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)]"
                  placeholder="에이전트 ID (선택)"
                  value={policyForm.matchAgentId}
                  onChange={(e) => setPolicyForm((p) => ({ ...p, matchAgentId: e.target.value }))}
                />
                <select
                  className="rounded border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)]"
                  value={policyForm.matchMode}
                  onChange={(e) => setPolicyForm((p) => ({ ...p, matchMode: e.target.value }))}
                >
                  <option value="">모드 (전체)</option>
                  <option value="delegate">delegate</option>
                  <option value="direct">direct</option>
                </select>
                <input
                  className="rounded border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)]"
                  placeholder="커맨드 패턴 regex (선택)"
                  value={policyForm.matchCommandPattern}
                  onChange={(e) => setPolicyForm((p) => ({ ...p, matchCommandPattern: e.target.value }))}
                />
                <input
                  className="rounded border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)]"
                  placeholder="자동 승인 (분)"
                  type="number"
                  value={policyForm.autoApproveMinutes}
                  onChange={(e) => setPolicyForm((p) => ({ ...p, autoApproveMinutes: e.target.value }))}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-[var(--color-foreground)]">
                <input
                  type="checkbox"
                  checked={policyForm.isActive}
                  onChange={(e) => setPolicyForm((p) => ({ ...p, isActive: e.target.checked }))}
                />
                활성화
              </label>
              <div className="flex gap-2">
                <button
                  onClick={handleSavePolicy}
                  className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2 text-sm text-white hover:opacity-90"
                >
                  저장
                </button>
                <button
                  onClick={() => setShowPolicyForm(false)}
                  className="rounded-[var(--radius-control)] border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-foreground)] hover:bg-[var(--color-surface)]"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {policies.length === 0 && !showPolicyForm && (
            <p className="py-8 text-center text-sm text-[var(--color-muted-foreground)]">
              등록된 정책 없음
            </p>
          )}
          {policies.map((p) => (
            <div
              key={p.id}
              className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--color-foreground)]">
                    {p.name}
                    {!p.isActive && (
                      <span className="ml-2 text-xs text-[var(--color-muted-foreground)]">(비활성)</span>
                    )}
                  </p>
                  <p className="text-xs text-[var(--color-tertiary)]">
                    {p.matchAgentId && <>에이전트: {p.matchAgentId} · </>}
                    {p.matchMode && <>모드: {p.matchMode} · </>}
                    {p.matchCommandPattern && <>패턴: {p.matchCommandPattern} · </>}
                    {p.autoApproveMinutes && <>{p.autoApproveMinutes}분 자동승인</>}
                  </p>
                </div>
                <button
                  onClick={() => resetPolicyForm(p)}
                  className="text-xs text-[var(--color-primary)] hover:underline"
                >
                  수정
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
