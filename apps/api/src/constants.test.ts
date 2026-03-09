import { describe, it, expect } from "vitest";
import { eventCategoryOf, statusFromEventType, EVENT_CATEGORIES } from "@vulcan/shared/constants";

describe("eventCategoryOf", () => {
  it("agent 이벤트를 agent 카테고리로 분류한다", () => {
    expect(eventCategoryOf("agent.create")).toBe("agent");
    expect(eventCategoryOf("agent.update")).toBe("agent");
    expect(eventCategoryOf("agent.deactivate")).toBe("agent");
    expect(eventCategoryOf("agent.pause")).toBe("agent");
    expect(eventCategoryOf("agent.resume")).toBe("agent");
  });

  it("task 이벤트를 task 카테고리로 분류한다", () => {
    expect(eventCategoryOf("task.create")).toBe("task");
    expect(eventCategoryOf("task.update")).toBe("task");
    expect(eventCategoryOf("task.move")).toBe("task");
    expect(eventCategoryOf("task.delete")).toBe("task");
    expect(eventCategoryOf("task.comment")).toBe("task");
  });

  it("command 이벤트를 command 카테고리로 분류한다", () => {
    expect(eventCategoryOf("command.queued")).toBe("command");
    expect(eventCategoryOf("command.sent")).toBe("command");
    expect(eventCategoryOf("command.failed")).toBe("command");
    expect(eventCategoryOf("command.retry")).toBe("command");
  });

  it("skill 이벤트를 skill 카테고리로 분류한다", () => {
    expect(eventCategoryOf("skill.install")).toBe("skill");
    expect(eventCategoryOf("skill.remove")).toBe("skill");
    expect(eventCategoryOf("skill.sync")).toBe("skill");
  });

  it("system 이벤트를 system 카테고리로 분류한다", () => {
    expect(eventCategoryOf("system.error")).toBe("system");
    expect(eventCategoryOf("system.sync")).toBe("system");
    expect(eventCategoryOf("system.health")).toBe("system");
  });

  it("gateway 이벤트를 gateway 카테고리로 분류한다", () => {
    expect(eventCategoryOf("gateway.connected")).toBe("gateway");
    expect(eventCategoryOf("gateway.disconnected")).toBe("gateway");
  });

  it("레거시 이벤트를 legacy 카테고리로 분류한다", () => {
    expect(eventCategoryOf("message")).toBe("legacy");
    expect(eventCategoryOf("tool")).toBe("legacy");
    expect(eventCategoryOf("exec")).toBe("legacy");
    expect(eventCategoryOf("ping")).toBe("legacy");
    expect(eventCategoryOf("sync")).toBe("legacy");
    expect(eventCategoryOf("error")).toBe("legacy");
  });

  it("알 수 없는 타입은 legacy로 분류한다", () => {
    expect(eventCategoryOf("unknown.type")).toBe("legacy");
    expect(eventCategoryOf("")).toBe("legacy");
  });

  it("모든 EVENT_CATEGORIES의 타입이 올바르게 매핑된다", () => {
    for (const [category, types] of Object.entries(EVENT_CATEGORIES)) {
      for (const type of types) {
        expect(eventCategoryOf(type)).toBe(category);
      }
    }
  });
});

describe("statusFromEventType", () => {
  it("error 포함 → error", () => {
    expect(statusFromEventType("error")).toBe("error");
    expect(statusFromEventType("system.error")).toBe("error");
  });

  it("tool/exec 포함 → executing", () => {
    expect(statusFromEventType("tool")).toBe("executing");
    expect(statusFromEventType("exec")).toBe("executing");
  });

  it("sync 포함 → syncing", () => {
    expect(statusFromEventType("sync")).toBe("syncing");
    expect(statusFromEventType("system.sync")).toBe("syncing");
  });

  it("message/ping 포함 → writing", () => {
    expect(statusFromEventType("message")).toBe("writing");
    expect(statusFromEventType("ping")).toBe("writing");
  });

  it("research/search 포함 → researching", () => {
    expect(statusFromEventType("research")).toBe("researching");
    expect(statusFromEventType("search")).toBe("researching");
  });

  it("매칭 없으면 → idle", () => {
    expect(statusFromEventType("agent.create")).toBe("idle");
    expect(statusFromEventType("task.move")).toBe("idle");
  });
});
