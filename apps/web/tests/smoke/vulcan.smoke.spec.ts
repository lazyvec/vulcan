import { expect, test, type Page } from "@playwright/test";

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

async function useDesktop(page: Page) {
  await page.setViewportSize(DESKTOP);
}

async function useMobile(page: Page) {
  await page.setViewportSize(MOBILE);
}

test.describe("Vulcan Mission Control smoke (16)", () => {
  test("desktop: tasks page renders kanban and live activity", async ({ page }) => {
    await useDesktop(page);
    await page.goto("/tasks");

    await expect(page.getByRole("heading", { name: "Backlog" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "In Progress" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Review" })).toBeVisible();
    await expect(page.getByText("Task Live Activity")).toBeVisible();
  });

  test("desktop: topbar pause/resume and ping work", async ({ page }) => {
    await useDesktop(page);
    await page.goto("/tasks");

    const pauseButton = page.getByRole("button", { name: "Pause" });
    await pauseButton.click();
    await expect(page.getByText("PAUSED", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Resume" }).click();
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

    const pingRequest = page.waitForRequest((request) => {
      if (!request.url().includes("/api/events")) {
        return false;
      }
      if (request.method() !== "POST") {
        return false;
      }
      return request.postData()?.includes("ping") ?? false;
    });
    await page.getByRole("button", { name: /Ping/i }).click();
    await pingRequest;
  });

  test("desktop: office demo button emits /api/events", async ({ page }) => {
    await useDesktop(page);
    await page.goto("/office");

    const eventResponse = page.waitForResponse((response) => {
      if (!response.url().includes("/api/events")) {
        return false;
      }
      if (response.request().method() !== "POST") {
        return false;
      }
      return response.status() === 200;
    });

    await page.getByTestId("office-demo-executing").click();
    await eventResponse;
  });

  test("mobile: tasks page remains usable", async ({ page }) => {
    await useMobile(page);
    await page.goto("/tasks");

    await expect(page.getByPlaceholder("Search tasks, docs, memory")).toBeVisible();
    await expect(page.getByText("Task Live Activity")).toBeVisible();
    await expect(page.getByRole("link", { name: "Office" })).toBeVisible();
  });

  test("mobile: docs query syncs into URL", async ({ page }) => {
    await useMobile(page);
    await page.goto("/docs");

    const search = page.getByPlaceholder("Search tasks, docs, memory");
    await search.fill("runbook");
    await expect(page).toHaveURL(/\/docs\?q=runbook/);
  });

  test("mobile: office activity groups and demo event cards render", async ({ page }) => {
    await useMobile(page);
    await page.goto("/office");

    const eventResponse = page.waitForResponse((response) => {
      if (!response.url().includes("/api/events")) {
        return false;
      }
      if (response.request().method() !== "POST") {
        return false;
      }
      return response.status() === 200;
    });

    await page.getByTestId("office-demo-error").click();
    await eventResponse;
    await expect(page.getByTestId("activity-group").first()).toBeVisible();
    await expect(page.getByTestId("activity-item").first()).toBeVisible();
  });

  /* ── Page rendering (desktop, 7개) ── */

  test("desktop: team page renders agent control panel", async ({ page }) => {
    await useDesktop(page);
    await page.goto("/team");

    await expect(page.getByRole("heading", { name: "Agent Control Panel" })).toBeVisible();
    await expect(page.getByText("Gateway Ops")).toBeVisible();
  });

  test("desktop: activity page renders metric cards", async ({ page }) => {
    await useDesktop(page);
    await page.goto("/activity");

    await expect(page.getByText("이벤트 (24h)")).toBeVisible();
    await expect(page.getByText("활성 에이전트")).toBeVisible();
    await expect(page.getByText("커맨드 성공률")).toBeVisible();
  });

  test("desktop: skills page renders catalog", async ({ page }) => {
    await useDesktop(page);
    await page.goto("/skills");

    await expect(page.getByRole("heading", { name: "Skill Catalog" })).toBeVisible();
    await expect(page.getByPlaceholder("스킬 검색...")).toBeVisible();
  });

  test("desktop: approvals page renders heading and tabs", async ({ page }) => {
    await useDesktop(page);
    await page.goto("/approvals");

    await expect(page.getByRole("heading", { name: "Approvals" })).toBeVisible();
    await expect(page.getByRole("button", { name: /대기 중/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "처리 이력" })).toBeVisible();
    await expect(page.getByRole("button", { name: "정책 관리" })).toBeVisible();
  });

  test("desktop: vault page renders search and file tree", async ({ page }) => {
    await useDesktop(page);
    await page.goto("/vault");

    await expect(page.getByPlaceholder("노트 검색...")).toBeVisible();
    await expect(page.getByPlaceholder("URL 클리핑...")).toBeVisible();
  });

  test("desktop: notifications page renders heading and categories", async ({ page }) => {
    await useDesktop(page);
    await page.goto("/notifications");

    await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
    await expect(page.getByText("알림 카테고리")).toBeVisible();
  });

  test("desktop: memory page renders journal and LTM sections", async ({ page }) => {
    await useDesktop(page);
    await page.goto("/memory");

    await expect(page.getByText("Daily Journal")).toBeVisible();
    await expect(page.getByText("Long-term Memory")).toBeVisible();
  });

  /* ── Navigation ── */

  test("desktop: sidebar shows all 12 navigation links", async ({ page }) => {
    await useDesktop(page);
    await page.goto("/tasks");

    const navLinks = [
      "Tasks", "Calendar", "Projects", "Memory", "Docs", "Vault",
      "Team", "Office", "Skills", "Activity", "Approvals", "Notifications",
    ];

    for (const name of navLinks) {
      await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
    }
  });

  /* ── API ── */

  test("api: health endpoint returns ok", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.ok).toBe(true);
  });

  /* ── Cross-page navigation ── */

  test("desktop: navigate Tasks → Team → Activity sequentially", async ({ page }) => {
    await useDesktop(page);

    await page.goto("/tasks");
    await expect(page.getByRole("heading", { name: "Backlog" })).toBeVisible();

    await page.getByRole("link", { name: "Team", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Agent Control Panel" })).toBeVisible();

    await page.getByRole("link", { name: "Activity", exact: true }).click();
    await expect(page.getByText("이벤트 (24h)")).toBeVisible();
  });
});
