/**
 * Store 통합 테스트 — 임시 SQLite DB로 실제 CRUD를 검증합니다.
 *
 * server.ts 전체를 import하면 Gateway/BullMQ 초기화가 일어나므로,
 * DB_PATH만 임시 경로로 설정하여 store 함수들을 직접 테스트합니다.
 */
import { describe, it, expect, beforeAll } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

// 임시 DB 경로를 환경변수로 설정 (db.ts가 참조)
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vulcan-test-"));
const dbPath = path.join(tmpDir, "test.db");
process.env.VULCAN_DB_PATH = dbPath;
// drizzle 마이그레이션 디렉토리가 없으면 스킵하도록 존재하지 않는 경로 설정
process.env.VULCAN_DRIZZLE_PATH = path.join(tmpDir, "no-migrations");

// db.ts는 모듈 로드 시점에 SQLite를 생성하므로, 환경변수 설정 후 동적 import
const { ensureSchema } = await import("../db");
const store = await import("../store");

beforeAll(() => {
  ensureSchema();
});

describe("Agent CRUD", () => {
  it("에이전트를 생성하고 조회한다", () => {
    const agent = store.createAgent({
      name: "test-agent",
      roleTags: ["backend"],
      mission: "테스트 에이전트",
      avatarKey: "seed",
    });
    expect(agent.id).toBeTruthy();
    expect(agent.name).toBe("test-agent");
    expect(agent.roleTags).toEqual(["backend"]);

    const found = store.getAgentById(agent.id);
    expect(found).toBeTruthy();
    expect(found!.name).toBe("test-agent");
  });

  it("에이전트 목록을 조회한다", () => {
    const agents = store.getAgents();
    expect(agents.length).toBeGreaterThanOrEqual(1);
  });

  it("에이전트를 수정한다", () => {
    const agent = store.createAgent({
      name: "update-me",
      roleTags: [],
      mission: "수정 대상",
      avatarKey: "seed",
    });

    const updated = store.updateAgent(agent.id, { mission: "수정 완료" });
    expect(updated).toBeTruthy();
    expect(updated!.mission).toBe("수정 완료");
  });

  it("에이전트를 비활성화한다", () => {
    const agent = store.createAgent({
      name: "deactivate-me",
      roleTags: [],
      mission: "비활성화 대상",
      avatarKey: "seed",
    });

    const deactivated = store.deactivateAgent(agent.id);
    expect(deactivated).toBeTruthy();
    expect(deactivated!.isActive).toBe(false);
  });
});

describe("Task CRUD", () => {
  it("태스크를 생성하고 조회한다", () => {
    const task = store.createTask({
      title: "테스트 태스크",
      lane: "backlog",
      priority: "medium",
    });
    expect(task.id).toBeTruthy();
    expect(task.title).toBe("테스트 태스크");
    expect(task.lane).toBe("backlog");

    const found = store.getTaskById(task.id);
    expect(found).toBeTruthy();
    expect(found!.title).toBe("테스트 태스크");
  });

  it("태스크를 수정한다", () => {
    const task = store.createTask({
      title: "수정 대상 태스크",
      lane: "backlog",
      priority: "low",
    });

    const updated = store.updateTask(task.id, { title: "수정됨", priority: "high" });
    expect(updated).toBeTruthy();
    expect(updated!.title).toBe("수정됨");
    expect(updated!.priority).toBe("high");
  });

  it("태스크 레인을 변경한다", () => {
    const task = store.createTask({
      title: "레인 변경",
      lane: "backlog",
      priority: "medium",
    });

    const moved = store.updateTaskLane(task.id, "in_progress");
    expect(moved).toBeTruthy();
    expect(moved!.lane).toBe("in_progress");
  });

  it("태스크를 삭제한다", () => {
    const task = store.createTask({
      title: "삭제 대상",
      lane: "backlog",
      priority: "medium",
    });

    const deleted = store.deleteTask(task.id);
    expect(deleted).toBe(true);

    const found = store.getTaskById(task.id);
    expect(found).toBeNull();
  });

  it("태스크 코멘트를 추가한다", () => {
    const task = store.createTask({
      title: "코멘트 테스트",
      lane: "backlog",
      priority: "medium",
    });

    const comment = store.addTaskComment({
      taskId: task.id,
      author: "tester",
      content: "테스트 코멘트",
    });
    expect(comment.id).toBeTruthy();
    expect(comment.content).toBe("테스트 코멘트");

    const comments = store.getTaskComments(task.id);
    expect(comments.length).toBe(1);
  });
});

describe("Event Ingestion", () => {
  it("이벤트를 저장하고 조회한다", () => {
    const event = store.appendEvent({
      type: "task.create",
      summary: "태스크 생성 이벤트",
    });
    expect(event.id).toBeTruthy();
    expect(event.type).toBe("task.create");

    const events = store.getLatestEvents(10);
    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  it("이벤트 통계를 조회한다", () => {
    const since = Date.now() - 86400000; // 24시간 전
    const stats = store.getEventStats(since);
    expect(stats).toBeTruthy();
  });
});

describe("Approval Policy CRUD", () => {
  it("승인 정책을 생성하고 조회한다", () => {
    const policy = store.createApprovalPolicy({
      name: "테스트 정책",
      description: "테스트용",
    });
    expect(policy.id).toBeTruthy();
    expect(policy.name).toBe("테스트 정책");

    const policies = store.getApprovalPolicies();
    expect(policies.some((p) => p.id === policy.id)).toBe(true);
  });

  it("승인 정책을 수정한다", () => {
    const policy = store.createApprovalPolicy({
      name: "수정 대상",
      description: "수정 전",
    });

    const updated = store.updateApprovalPolicy(policy.id, {
      description: "수정 후",
    });
    expect(updated).toBeTruthy();
    expect(updated!.description).toBe("수정 후");
  });
});

describe("Audit Log", () => {
  it("감사 로그를 기록하고 조회한다", () => {
    store.appendAuditLog({
      actor: "tester",
      action: "test.action",
      entityType: "test",
      entityId: "test-1",
      source: "test",
    });

    const logs = store.getAuditLogs(10);
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs.some((l) => l.action === "test.action")).toBe(true);
  });
});

describe("countRecords", () => {
  it("레코드 수를 반환한다", () => {
    const counts = store.countRecords();
    expect(counts).toBeTruthy();
    expect(typeof counts.agents).toBe("number");
    expect(typeof counts.tasks).toBe("number");
    expect(typeof counts.events).toBe("number");
  });
});
