import { randomUUID } from "node:crypto";
import type { WorkflowTemplate, WorkflowStep, WorkOrder } from "@vulcan/shared/types";
import { createWorkOrder, listWorkOrders } from "./store";
import { isFeatureEnabled } from "./feature-flags";

// ── 워크플로우 템플릿 정의 ────────────────────────────────────────────────────

const PM_SKILLS_TEMPLATE: WorkflowTemplate = {
  id: "pm-skills",
  name: "PM Skills 워크플로우",
  description: "Discover → Strategy → Write-PRD 3단계 체인",
  steps: [
    {
      name: "Discover",
      workOrderType: "discover",
      toAgentId: "metis",
      description: "시장 조사 및 요구사항 발견",
    },
    {
      name: "Strategy",
      workOrderType: "strategy",
      toAgentId: "athena",
      description: "전략 수립 및 방향성 결정",
    },
    {
      name: "Write-PRD",
      workOrderType: "prd",
      toAgentId: "themis",
      description: "PRD(Product Requirements Document) 작성",
    },
  ],
};

const TEMPLATES: Map<string, WorkflowTemplate> = new Map([
  [PM_SKILLS_TEMPLATE.id, PM_SKILLS_TEMPLATE],
]);

// ── Public API ───────────────────────────────────────────────────────────────

export function getWorkflowTemplates(): WorkflowTemplate[] {
  return [...TEMPLATES.values()];
}

export function getWorkflowTemplate(id: string): WorkflowTemplate | undefined {
  return TEMPLATES.get(id);
}

export interface WorkflowInstance {
  workflowId: string;
  templateId: string;
  steps: WorkflowStep[];
  firstWorkOrderId: string;
}

export function triggerWorkflow(input: {
  templateId: string;
  project?: string | null;
  inputsJson?: string;
  fromAgentId?: string;
}): WorkflowInstance | null {
  if (!isFeatureEnabled("pm-skills-workflow")) {
    return null;
  }

  const template = TEMPLATES.get(input.templateId);
  if (!template || template.steps.length === 0) {
    return null;
  }

  const workflowId = randomUUID();
  const firstStep = template.steps[0]!;

  const workflowMeta = JSON.stringify({
    ...JSON.parse(input.inputsJson ?? "{}"),
    workflowId,
    templateId: input.templateId,
    stepIndex: 0,
    stepName: firstStep.name,
  });

  const firstWO = createWorkOrder({
    type: firstStep.workOrderType,
    summary: `[${template.name}] ${firstStep.name}: ${firstStep.description}`,
    fromAgentId: input.fromAgentId ?? "hermes",
    toAgentId: firstStep.toAgentId,
    project: input.project ?? null,
    inputsJson: workflowMeta,
  });

  return {
    workflowId,
    templateId: input.templateId,
    steps: template.steps,
    firstWorkOrderId: firstWO.id,
  };
}

/**
 * WorkOrder 완료 시 호출. 워크플로우 다음 단계가 있으면 자동 생성.
 * @returns 다음 단계 WorkOrder (있으면) 또는 null
 */
export function advanceWorkflow(completedWO: WorkOrder): WorkOrder | null {
  if (!isFeatureEnabled("pm-skills-workflow")) {
    return null;
  }

  let inputs: Record<string, unknown>;
  try {
    inputs = JSON.parse(completedWO.inputsJson);
  } catch {
    return null;
  }

  const workflowId = inputs.workflowId as string | undefined;
  const templateId = inputs.templateId as string | undefined;
  const stepIndex = inputs.stepIndex as number | undefined;

  if (!workflowId || !templateId || stepIndex === undefined) {
    return null;
  }

  const template = TEMPLATES.get(templateId);
  if (!template) {
    return null;
  }

  const nextIndex = stepIndex + 1;
  if (nextIndex >= template.steps.length) {
    return null; // 마지막 단계 완료
  }

  const nextStep = template.steps[nextIndex]!;
  const nextMeta = JSON.stringify({
    workflowId,
    templateId,
    stepIndex: nextIndex,
    stepName: nextStep.name,
  });

  return createWorkOrder({
    type: nextStep.workOrderType,
    summary: `[${template.name}] ${nextStep.name}: ${nextStep.description}`,
    fromAgentId: completedWO.toAgentId, // 이전 단계 에이전트가 발행자
    toAgentId: nextStep.toAgentId,
    project: completedWO.project ?? null,
    parentWorkOrderId: completedWO.id,
    inputsJson: nextMeta,
  });
}

export interface WorkflowStatus {
  workflowId: string;
  templateId: string;
  templateName: string;
  steps: Array<{
    index: number;
    name: string;
    toAgentId: string;
    workOrderId: string | null;
    status: string;
  }>;
  currentStep: number;
  completed: boolean;
}

export function getWorkflowStatus(workflowId: string): WorkflowStatus | null {
  // workflowId를 가진 모든 WorkOrder 조회
  const allWOs = listWorkOrders({ limit: 100 });
  const workflowWOs: Array<{ wo: WorkOrder; stepIndex: number; templateId: string }> = [];

  for (const wo of allWOs) {
    try {
      const inputs = JSON.parse(wo.inputsJson);
      if (inputs.workflowId === workflowId) {
        workflowWOs.push({
          wo,
          stepIndex: inputs.stepIndex as number,
          templateId: inputs.templateId as string,
        });
      }
    } catch {
      // 무시
    }
  }

  if (workflowWOs.length === 0) {
    return null;
  }

  const templateId = workflowWOs[0]!.templateId;
  const template = TEMPLATES.get(templateId);
  if (!template) {
    return null;
  }

  const steps = template.steps.map((step, index) => {
    const match = workflowWOs.find((w) => w.stepIndex === index);
    return {
      index,
      name: step.name,
      toAgentId: step.toAgentId,
      workOrderId: match?.wo.id ?? null,
      status: match?.wo.status ?? "pending",
    };
  });

  const lastActive = workflowWOs.reduce(
    (max, w) => Math.max(max, w.stepIndex),
    0,
  );
  const allCompleted = workflowWOs.length === template.steps.length &&
    workflowWOs.every((w) => w.wo.status === "completed");

  return {
    workflowId,
    templateId,
    templateName: template.name,
    steps,
    currentStep: lastActive,
    completed: allCompleted,
  };
}
