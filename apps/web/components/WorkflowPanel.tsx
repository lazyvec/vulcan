"use client";

import { useState, useEffect, useCallback } from "react";
import type { WorkflowTemplate } from "@vulcan/shared/types";
import type { WorkflowStatusResponse } from "@/lib/api-server";
import { Play, CheckCircle2, Clock, ArrowRight, Loader2 } from "lucide-react";

interface Props {
  templates: WorkflowTemplate[];
  initialWorkflows: WorkflowStatusResponse[];
}

const STEP_STATUS_ICON: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  completed: { icon: CheckCircle2, color: "var(--color-success)", label: "완료" },
  in_progress: { icon: Loader2, color: "var(--color-primary)", label: "진행중" },
  accepted: { icon: ArrowRight, color: "var(--color-info)", label: "수락" },
  review: { icon: Loader2, color: "var(--color-chart-3)", label: "검증중" },
  pending: { icon: Clock, color: "var(--color-warning)", label: "대기" },
  failed: { icon: Clock, color: "var(--color-destructive)", label: "실패" },
};

function getStepIcon(status: string) {
  return STEP_STATUS_ICON[status] ?? STEP_STATUS_ICON.pending!;
}

export function WorkflowPanel({ templates, initialWorkflows }: Props) {
  const [workflows, setWorkflows] = useState(initialWorkflows);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 활성 워크플로우 폴링 (10초)
  const hasActive = workflows.some((wf) => !wf.completed);

  const pollWorkflows = useCallback(async () => {
    if (workflows.length === 0) return;
    try {
      const results = await Promise.all(
        workflows.map(async (wf) => {
          const res = await fetch(`/api/workflows/${wf.workflowId}/status`);
          if (!res.ok) return wf;
          const data = (await res.json()) as { ok: boolean; workflow: WorkflowStatusResponse };
          return data.ok ? data.workflow : wf;
        }),
      );
      setWorkflows(results);
    } catch {
      // 폴링 실패 무시
    }
  }, [workflows]);

  useEffect(() => {
    if (!hasActive) return;
    const timer = setInterval(pollWorkflows, 10_000);
    return () => clearInterval(timer);
  }, [hasActive, pollWorkflows]);

  async function handleTrigger(templateId: string) {
    setTriggering(true);
    setError(null);
    try {
      const res = await fetch("/api/workflows/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        workflow?: { workflowId: string; templateId: string };
        error?: string;
      };
      if (!data.ok) {
        setError(typeof data.error === "string" ? data.error : "워크플로우 시작 실패");
        return;
      }
      // 새 워크플로우 상태 조회
      if (data.workflow) {
        try {
          const statusRes = await fetch(`/api/workflows/${data.workflow.workflowId}/status`);
          const statusData = (await statusRes.json()) as {
            ok: boolean;
            workflow: WorkflowStatusResponse;
          };
          if (statusData.ok) {
            setWorkflows((prev) => [...prev, statusData.workflow]);
          }
        } catch {
          // 상태 조회 실패해도 트리거는 성공
        }
      }
    } catch {
      setError("네트워크 오류");
    } finally {
      setTriggering(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 템플릿 + 트리거 */}
      {templates.map((tmpl) => {
        const active = workflows.filter((wf) => wf.templateId === tmpl.id);

        return (
          <div key={tmpl.id} className="vulcan-card rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
                  {tmpl.name}
                </h3>
                <p className="text-xs text-[var(--color-muted-foreground)]">{tmpl.description}</p>
              </div>
              <button
                type="button"
                onClick={() => handleTrigger(tmpl.id)}
                disabled={triggering}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50"
                style={{ background: "var(--color-primary)" }}
              >
                {triggering ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                시작
              </button>
            </div>

            {/* 템플릿 스텝 미리보기 (활성 워크플로우 없을 때) */}
            {active.length === 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {tmpl.steps.map((step, i) => (
                  <div key={step.name} className="flex items-center gap-2">
                    <StepBox name={step.name} agentId={step.toAgentId} status="pending" />
                    {i < tmpl.steps.length - 1 && (
                      <ArrowRight size={14} className="text-[var(--color-muted-foreground)]" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 활성 워크플로우 */}
            {active.map((wf) => (
              <WorkflowProgress key={wf.workflowId} workflow={wf} />
            ))}

            {error && (
              <p className="mt-2 text-xs text-[var(--color-destructive)]">{error}</p>
            )}
          </div>
        );
      })}

      {templates.length === 0 && (
        <div className="vulcan-card rounded-xl p-6 text-center text-sm text-[var(--color-muted-foreground)]">
          워크플로우 템플릿이 없습니다
        </div>
      )}
    </div>
  );
}

function WorkflowProgress({ workflow: wf }: { workflow: WorkflowStatusResponse }) {
  const completedCount = wf.steps.filter((s) => s.status === "completed").length;
  const currentStep = wf.steps.find(
    (s) => s.status !== "completed" && s.status !== "pending",
  );

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {wf.steps.map((step, i) => (
          <div key={step.index} className="flex items-center gap-2">
            <StepBox
              name={step.name}
              agentId={step.toAgentId}
              status={step.status}
            />
            {i < wf.steps.length - 1 && (
              <ArrowRight size={14} className="text-[var(--color-muted-foreground)]" />
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-[var(--color-muted-foreground)]">
        진행: {completedCount}/{wf.steps.length}
        {currentStep && ` — ${currentStep.name} ${getStepIcon(currentStep.status).label}`}
        {wf.completed && " — 전체 완료"}
      </p>
    </div>
  );
}

function StepBox({
  name,
  agentId,
  status,
}: {
  name: string;
  agentId: string;
  status: string;
}) {
  const config = getStepIcon(status);
  const Icon = config.icon;
  const isAnimated = status === "in_progress" || status === "review";

  return (
    <div
      className="flex flex-col items-center gap-1 rounded-lg border px-3 py-2 text-center"
      style={{
        borderColor: `color-mix(in srgb, ${config.color} 40%, transparent)`,
        background: `color-mix(in srgb, ${config.color} 8%, transparent)`,
        minWidth: 80,
      }}
    >
      <span className="text-xs font-medium text-[var(--color-foreground)]">{name}</span>
      <span className="text-[10px] text-[var(--color-muted-foreground)] capitalize">{agentId}</span>
      <span className="flex items-center gap-1 text-[10px]" style={{ color: config.color }}>
        <Icon size={10} className={isAnimated ? "animate-spin" : ""} />
        {config.label}
      </span>
    </div>
  );
}
