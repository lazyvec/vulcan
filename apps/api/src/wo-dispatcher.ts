/**
 * WorkOrder 자동 디스패치 — WO가 생성(pending)되면 Gateway를 통해 에이전트에게 지시
 */
import type { WorkOrder } from "@vulcan/shared/types";
import { getWorkOrder, updateWorkOrder, getAgentById } from "./store";
import { isFeatureEnabled } from "./feature-flags";

// ── 프롬프트 빌더 ──────────────────────────────────────────────────────────────

export function buildWoPrompt(wo: WorkOrder): string {
  const lines: string[] = [
    "[VULCAN_WORK_ORDER]",
    `workOrderId=${wo.id}`,
    `type=${wo.type}`,
    `priority=${wo.priority}`,
    `from=${wo.fromAgentId}`,
    "",
    `## 요약`,
    wo.summary,
  ];

  if (wo.acceptanceCriteria.length > 0) {
    lines.push("", "## 수락 기준");
    for (const c of wo.acceptanceCriteria) {
      lines.push(`- ${c}`);
    }
  }

  // inputsJson에서 워크플로우 메타 제외한 실질 데이터 추출
  try {
    const inputs = JSON.parse(wo.inputsJson);
    const { workflowId, templateId, stepIndex, stepName, ...rest } = inputs as Record<string, unknown>;
    if (Object.keys(rest).length > 0) {
      lines.push("", "## 입력 데이터", "```json", JSON.stringify(rest, null, 2), "```");
    }
    if (stepName) {
      lines.push("", `## 워크플로우 단계: ${stepName} (${(stepIndex as number) + 1}단계)`);
    }
  } catch {
    // inputsJson 파싱 실패 시 무시
  }

  lines.push(
    "",
    "## 지시",
    "위 WorkOrder를 수행하고, 완료 시 결과를 POST /api/work-orders/" + wo.id + "/result 로 보고하세요.",
    "수락 기준을 모두 충족해야 합니다.",
  );

  return lines.join("\n");
}

// ── 디스패치 실행 ──────────────────────────────────────────────────────────────

export interface WoDispatchDeps {
  resolveGatewaySessionKeyForAgent: (
    agentId: string,
    config: Record<string, unknown> | undefined,
  ) => Promise<string | null>;
  gatewayRpcChatSend: (params: Record<string, unknown>) => Promise<unknown>;
  extractGatewayCommandId: (payload: unknown) => string | null;
}

export async function executeWoDispatch(
  workOrderId: string,
  deps: WoDispatchDeps,
): Promise<{ ok: boolean; error?: string }> {
  if (!isFeatureEnabled("pm-skills-workflow")) {
    return { ok: false, error: "pm-skills-workflow feature flag disabled" };
  }

  const wo = getWorkOrder(workOrderId);
  if (!wo) {
    return { ok: false, error: `WorkOrder not found: ${workOrderId}` };
  }

  // pending 상태만 디스패치
  if (wo.status !== "pending") {
    return { ok: false, error: `WorkOrder is not pending (status=${wo.status})` };
  }

  const agent = getAgentById(wo.toAgentId);
  if (!agent) {
    return { ok: false, error: `Agent not found: ${wo.toAgentId}` };
  }

  // 상태를 in_progress로 전이
  updateWorkOrder(workOrderId, { status: "in_progress" });

  try {
    const sessionKey = await deps.resolveGatewaySessionKeyForAgent(wo.toAgentId, agent.config);
    if (!sessionKey) {
      // Gateway 미연결 → pending으로 롤백
      updateWorkOrder(workOrderId, { status: "pending" });
      return { ok: false, error: `Gateway session key not resolved for: ${wo.toAgentId}` };
    }

    const prompt = buildWoPrompt(wo);
    const gatewayResult = await deps.gatewayRpcChatSend({
      sessionKey,
      message: prompt,
      idempotencyKey: `wo-dispatch-${workOrderId}`,
    });

    // 커맨드 ID 추출 후 저장
    const commandId = deps.extractGatewayCommandId(gatewayResult);
    if (commandId) {
      updateWorkOrder(workOrderId, { linkedCommandId: commandId });
    }

    return { ok: true };
  } catch (error) {
    // 디스패치 실패 시 pending으로 롤백
    updateWorkOrder(workOrderId, { status: "pending" });
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[wo-dispatcher] 디스패치 실패 (${workOrderId}):`, msg);
    return { ok: false, error: msg };
  }
}
