import { randomUUID } from "node:crypto";
import { db, ensureSchema, getSqlite } from "../lib/db";
import {
  agentsTable,
  docsTable,
  eventsTable,
  memoryItemsTable,
  projectsTable,
  schedulesTable,
  tasksTable,
} from "../lib/schema";

function nowMinus(minutes: number) {
  return Date.now() - minutes * 60_000;
}

async function seed() {
  ensureSchema();

  const sqlite = getSqlite();
  sqlite.exec(`
    DELETE FROM events;
    DELETE FROM tasks;
    DELETE FROM projects;
    DELETE FROM agents;
    DELETE FROM memory_items;
    DELETE FROM docs;
    DELETE FROM schedules;
  `);

  const agents = [
    {
      id: "hermes",
      name: "Hermes",
      roleTags: JSON.stringify(["executor", "chat", "ops"]),
      mission: "대화와 실행을 연결하는 주 실행 에이전트",
      avatarKey: "hermes",
      status: "executing",
      statusSince: nowMinus(4),
      lastSeenAt: nowMinus(1),
    },
    {
      id: "vesta",
      name: "Vesta",
      roleTags: JSON.stringify(["planner", "docs"]),
      mission: "작업 분해 및 문서 정합성 유지",
      avatarKey: "vesta",
      status: "writing",
      statusSince: nowMinus(9),
      lastSeenAt: nowMinus(1),
    },
    {
      id: "atlas",
      name: "Atlas",
      roleTags: JSON.stringify(["infra", "deploy"]),
      mission: "런타임/인프라 상태 안정화",
      avatarKey: "atlas",
      status: "syncing",
      statusSince: nowMinus(7),
      lastSeenAt: nowMinus(2),
    },
    {
      id: "lyra",
      name: "Lyra",
      roleTags: JSON.stringify(["memory", "search"]),
      mission: "기억 레이어 관리 및 검색 보조",
      avatarKey: "lyra",
      status: "researching",
      statusSince: nowMinus(11),
      lastSeenAt: nowMinus(2),
    },
    {
      id: "aegis",
      name: "Aegis",
      roleTags: JSON.stringify(["qa", "verification"]),
      mission: "검증 루프 유지 및 실패 분석",
      avatarKey: "aegis",
      status: "idle",
      statusSince: nowMinus(14),
      lastSeenAt: nowMinus(3),
    },
  ];

  db.insert(agentsTable).values(agents).run();

  const projects = [
    {
      id: "project-vulcan-ui",
      name: "Vulcan UI Rebuild",
      status: "active",
      progress: 62,
      priority: "high",
      ownerAgentId: "hermes",
      updatedAt: nowMinus(3),
    },
    {
      id: "project-signal-ingest",
      name: "OpenClaw Signal Ingest",
      status: "active",
      progress: 48,
      priority: "high",
      ownerAgentId: "atlas",
      updatedAt: nowMinus(6),
    },
    {
      id: "project-memory-index",
      name: "Memory Index Hygiene",
      status: "review",
      progress: 81,
      priority: "medium",
      ownerAgentId: "lyra",
      updatedAt: nowMinus(10),
    },
  ];

  db.insert(projectsTable).values(projects).run();

  const tasks = [
    {
      id: "task-001",
      projectId: "project-vulcan-ui",
      title: "공통 레이아웃 Warm Obsidian 정렬",
      assigneeAgentId: "hermes",
      lane: "in_progress",
      createdAt: nowMinus(90),
      updatedAt: nowMinus(2),
    },
    {
      id: "task-002",
      projectId: "project-vulcan-ui",
      title: "Office status tile 애니메이션 정리",
      assigneeAgentId: "vesta",
      lane: "review",
      createdAt: nowMinus(130),
      updatedAt: nowMinus(8),
    },
    {
      id: "task-003",
      projectId: "project-signal-ingest",
      title: "OpenClaw 로그 파서 안정화",
      assigneeAgentId: "atlas",
      lane: "backlog",
      createdAt: nowMinus(50),
      updatedAt: nowMinus(22),
    },
    {
      id: "task-004",
      projectId: "project-memory-index",
      title: "Memory long-term 태그 정규화",
      assigneeAgentId: "lyra",
      lane: "in_progress",
      createdAt: nowMinus(70),
      updatedAt: nowMinus(5),
    },
  ];

  db.insert(tasksTable).values(tasks).run();

  const events = [
    {
      id: randomUUID(),
      ts: nowMinus(18),
      source: "openclaw",
      agentId: "hermes",
      projectId: "project-vulcan-ui",
      taskId: "task-001",
      type: "message",
      summary: "Hermes가 UI 상태 동기화 브리핑을 게시했습니다.",
      payloadJson: JSON.stringify({ channel: "main" }),
    },
    {
      id: randomUUID(),
      ts: nowMinus(14),
      source: "openclaw",
      agentId: "atlas",
      projectId: "project-signal-ingest",
      taskId: "task-003",
      type: "tool_call",
      summary: "Adapter parser가 신규 로그 섹션을 인식했습니다.",
      payloadJson: JSON.stringify({ parser: "regex-v2" }),
    },
    {
      id: randomUUID(),
      ts: nowMinus(9),
      source: "openclaw",
      agentId: "lyra",
      projectId: "project-memory-index",
      taskId: "task-004",
      type: "sync",
      summary: "Long-term memory 태그가 정규화되었습니다.",
      payloadJson: JSON.stringify({ tags: 24 }),
    },
    {
      id: randomUUID(),
      ts: nowMinus(4),
      source: "openclaw",
      agentId: "aegis",
      projectId: null,
      taskId: null,
      type: "error",
      summary: "검증 파이프라인에서 flaky task가 감지되었습니다.",
      payloadJson: JSON.stringify({ suite: "smoke", severity: "warning" }),
    },
  ];

  db.insert(eventsTable).values(events).run();

  const memoryItems = [
    {
      id: "mem-j-001",
      container: "journal",
      title: "2026-03-05 시작 메모",
      content: "Mission Control M0 범위 고정 후 7개 화면을 병렬 조립.",
      tags: JSON.stringify(["daily", "m0"]),
      sourceRef: "packet",
      createdAt: nowMinus(35),
    },
    {
      id: "mem-j-002",
      container: "journal",
      title: "SSE health",
      content: "stream heartbeat를 15초 주기로 유지.",
      tags: JSON.stringify(["sse", "ops"]),
      sourceRef: "runtime",
      createdAt: nowMinus(12),
    },
    {
      id: "mem-l-001",
      container: "longterm",
      title: "Warm Obsidian 규칙",
      content: "Hearth 포인트 색과 stone 계열 배경 조합은 모든 화면에서 유지.",
      tags: JSON.stringify(["brand", "theme"]),
      sourceRef: "brand",
      createdAt: nowMinus(320),
    },
    {
      id: "mem-l-002",
      container: "longterm",
      title: "OpenClaw 최소 신호 우선",
      content: "message/tool_call/error 최소 3종 이벤트 확보를 M0 기준으로 고정.",
      tags: JSON.stringify(["openclaw", "signals"]),
      sourceRef: "architecture",
      createdAt: nowMinus(290),
    },
  ];

  db.insert(memoryItemsTable).values(memoryItems).run();

  const docs = [
    {
      id: "doc-architecture",
      title: "Vulcan M0 Architecture",
      tags: JSON.stringify(["architecture", "m0"]),
      format: "markdown",
      content:
        "OpenClaw -> adapter-openclaw -> /api/adapter/ingest -> SQLite -> /api/stream(SSE) -> UI",
      createdAt: nowMinus(90),
      updatedAt: nowMinus(7),
    },
    {
      id: "doc-brand",
      title: "Warm Obsidian Token Guide",
      tags: JSON.stringify(["brand", "tokens"]),
      format: "markdown",
      content:
        "background/card/muted/border + primary hearth + semantic palette를 CSS 변수로 고정",
      createdAt: nowMinus(65),
      updatedAt: nowMinus(6),
    },
    {
      id: "doc-roadmap",
      title: "Roadmap M1/M2",
      tags: JSON.stringify(["roadmap", "future"]),
      format: "markdown",
      content:
        "M1 websocket + richer ingest, M2 proactive memory + pixel assets replacement",
      createdAt: nowMinus(40),
      updatedAt: nowMinus(5),
    },
  ];

  db.insert(docsTable).values(docs).run();

  const schedules = [
    {
      id: "sch-001",
      name: "OpenClaw signal poll",
      cronOrInterval: "*/1 * * * *",
      status: "running",
      lastRunAt: nowMinus(1),
      nextRunAt: nowMinus(-1),
      ownerAgentId: "atlas",
    },
    {
      id: "sch-002",
      name: "Daily mission digest",
      cronOrInterval: "0 9 * * *",
      status: "scheduled",
      lastRunAt: nowMinus(600),
      nextRunAt: nowMinus(-780),
      ownerAgentId: "vesta",
    },
    {
      id: "sch-003",
      name: "Memory compaction",
      cronOrInterval: "every 6h",
      status: "scheduled",
      lastRunAt: nowMinus(140),
      nextRunAt: nowMinus(-220),
      ownerAgentId: "lyra",
    },
  ];

  db.insert(schedulesTable).values(schedules).run();

  console.log("[seed] complete");
}

seed().catch((error) => {
  console.error("[seed] failed", error);
  process.exit(1);
});
