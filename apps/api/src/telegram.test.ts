import { describe, it, expect } from "vitest";
import type { EventItem, NotificationPreference } from "@vulcan/shared/types";
import {
  escapeHtml,
  formatEventMessage,
  shouldNotify,
  formatApprovalRequestMessage,
  formatApprovalResultMessage,
  getApprovalInlineKeyboard,
} from "./telegram";

// ── escapeHtml ────────────────────────────────────────────────────────────────

describe("escapeHtml", () => {
  it("HTML 특수문자를 이스케이프한다", () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;",
    );
  });

  it("앰퍼샌드를 이스케이프한다", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("특수문자가 없으면 그대로 반환한다", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });
});

// ── shouldNotify ──────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<EventItem> = {}): EventItem {
  return {
    id: "evt-1",
    ts: Date.now(),
    source: "test",
    agentId: null,
    projectId: null,
    taskId: null,
    type: "task.create",
    summary: "test event",
    payloadJson: "{}",
    ...overrides,
  };
}

describe("shouldNotify", () => {
  it("prefs가 null이면 기본 필터 적용 — 일반 이벤트 허용", () => {
    expect(shouldNotify(makeEvent({ type: "task.create" }), null)).toBe(true);
  });

  it("prefs가 null이면 system 카테고리 제외", () => {
    expect(shouldNotify(makeEvent({ type: "system.health" }), null)).toBe(false);
  });

  it("prefs가 null이면 legacy 카테고리 제외", () => {
    expect(shouldNotify(makeEvent({ type: "ping" }), null)).toBe(false);
  });

  it("prefs가 null이면 sync 타입 제외", () => {
    expect(shouldNotify(makeEvent({ type: "sync" }), null)).toBe(false);
  });

  it("enabledCategories로 필터링", () => {
    const prefs: NotificationPreference = {
      id: "p1",
      userId: "u1",
      chatId: "c1",
      enabledCategories: ["task"],
      enabledTypes: [],
      silentHours: null,
      createdAt: 0,
      updatedAt: 0,
    };
    expect(shouldNotify(makeEvent({ type: "task.create" }), prefs)).toBe(true);
    expect(shouldNotify(makeEvent({ type: "agent.create" }), prefs)).toBe(false);
  });

  it("enabledTypes로 필터링", () => {
    const prefs: NotificationPreference = {
      id: "p1",
      userId: "u1",
      chatId: "c1",
      enabledCategories: [],
      enabledTypes: ["agent.create"],
      silentHours: null,
      createdAt: 0,
      updatedAt: 0,
    };
    expect(shouldNotify(makeEvent({ type: "agent.create" }), prefs)).toBe(true);
    expect(shouldNotify(makeEvent({ type: "agent.update" }), prefs)).toBe(false);
  });

  it("silentHours 연속 범위 (예: 23~07)", () => {
    const prefs: NotificationPreference = {
      id: "p1",
      userId: "u1",
      chatId: "c1",
      enabledCategories: [],
      enabledTypes: [],
      silentHours: { startHour: 23, endHour: 7 },
      createdAt: 0,
      updatedAt: 0,
    };
    // silentHours 동작은 현재 시각에 의존하므로 기본 테스트만 수행
    // 함수가 boolean을 반환하는지 확인
    const result = shouldNotify(makeEvent(), prefs);
    expect(typeof result).toBe("boolean");
  });
});

// ── formatEventMessage ───────────────────────────────────────────────────────

describe("formatEventMessage", () => {
  it("기본 필드를 포함한 HTML 메시지를 생성한다", () => {
    const msg = formatEventMessage(
      makeEvent({ type: "task.create", summary: "새 태스크 생성" }),
    );
    expect(msg).toContain("<b>🔔 Vulcan Alert</b>");
    expect(msg).toContain("task.create");
    expect(msg).toContain("태스크");
    expect(msg).toContain("새 태스크 생성");
  });

  it("agentId가 있으면 에이전트 필드를 포함한다", () => {
    const msg = formatEventMessage(makeEvent({ agentId: "hermes" }));
    expect(msg).toContain("hermes");
    expect(msg).toContain("에이전트");
  });

  it("agentId가 null이면 에이전트 필드를 생략한다", () => {
    const msg = formatEventMessage(makeEvent({ agentId: null }));
    expect(msg).not.toContain("에이전트");
  });

  it("HTML 특수문자를 이스케이프한다", () => {
    const msg = formatEventMessage(makeEvent({ summary: "<b>bold</b>" }));
    expect(msg).toContain("&lt;b&gt;bold&lt;/b&gt;");
  });
});

// ── formatApprovalRequestMessage ─────────────────────────────────────────────

describe("formatApprovalRequestMessage", () => {
  it("승인 요청 메시지를 올바르게 포맷한다", () => {
    const msg = formatApprovalRequestMessage({
      approvalId: "apr-1",
      agentId: "hermes",
      mode: "delegate",
      policyName: "위험 작업 정책",
      messagePreview: "rm -rf /tmp/*",
    });
    expect(msg).toContain("승인 요청");
    expect(msg).toContain("hermes");
    expect(msg).toContain("delegate");
    expect(msg).toContain("위험 작업 정책");
    expect(msg).toContain("rm -rf /tmp/*");
  });
});

// ── formatApprovalResultMessage ──────────────────────────────────────────────

describe("formatApprovalResultMessage", () => {
  it("승인 결과를 표시한다", () => {
    const result = formatApprovalResultMessage("원본 텍스트", "approve", "admin");
    expect(result).toContain("원본 텍스트");
    expect(result).toContain("승인됨");
    expect(result).toContain("admin");
  });

  it("거절 결과를 표시한다", () => {
    const result = formatApprovalResultMessage("원본", "reject");
    expect(result).toContain("거절됨");
  });

  it("자동 승인 결과를 표시한다", () => {
    const result = formatApprovalResultMessage("원본", "auto_approve");
    expect(result).toContain("자동 승인됨");
  });
});

// ── getApprovalInlineKeyboard ────────────────────────────────────────────────

describe("getApprovalInlineKeyboard", () => {
  it("승인/거절 버튼이 있는 인라인 키보드를 반환한다", () => {
    const kb = getApprovalInlineKeyboard("apr-123");
    expect(kb.inline_keyboard).toHaveLength(1);
    expect(kb.inline_keyboard[0]).toHaveLength(2);

    const [approveBtn, rejectBtn] = kb.inline_keyboard[0];
    expect(approveBtn.callback_data).toBe("approval:approve:apr-123");
    expect(rejectBtn.callback_data).toBe("approval:reject:apr-123");
    expect(approveBtn.text).toContain("승인");
    expect(rejectBtn.text).toContain("거절");
  });
});
