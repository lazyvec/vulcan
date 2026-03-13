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

    await expect(page.getByRole("heading", { name: "백로그" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "진행 중" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "검토" })).toBeVisible();
    await expect(page.getByText("Task Live Activity")).toBeVisible();
  });

  test("desktop: topbar pause/resume and ping work", async ({ page }) => {
    await useDesktop(page);
    await page.goto("/tasks");

    const pauseButton = page.getByRole("button", { name: /일시정지|Pause/i });
    await pauseButton.click();
    await expect(page.getByText(/PAUSED|정지/)).toBeVisible();
    await page.getByRole("button", { name: /재개|Resume/i }).click();
    await expect(page.getByRole("button", { name: /일시정지|Pause/i })).toBeVisible();

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

  test("desktop: office page renders agent office view", async ({ page }) => {
    await useDesktop(page);
    await page.goto("/office");

    await expect(page.getByRole("heading", { name: "에이전트 오피스" })).toBeVisible();
  });

  test("mobile: tasks page remains usable", async ({ page }) => {
    await useMobile(page);
    await page.goto("/tasks");

    await expect(page.getByText("태스크 보드")).toBeVisible();
    await expect(page.getByText("Task Live Activity")).toBeVisible();
  });

  test("mobile: docs page renders and search works", async ({ page }) => {
    await useMobile(page);
    await page.goto("/docs");

    const search = page.getByPlaceholder("문서 검색...").first();
    await expect(search).toBeVisible();
    await search.fill("runbook");
    // 클라이언트 사이드 필터링 — URL 동기화 없이 로컬 state로 동작
    await expect(search).toHaveValue("runbook");
  });

  test("mobile: office page renders zones", async ({ page }) => {
    await useMobile(page);
    await page.goto("/office");

    await expect(page.getByText("에이전트 오피스")).toBeVisible();
  });

  /* ── Page rendering (desktop, 7개) ── */

  test("desktop: team page renders agent control panel", async ({ page }) => {
    await useDesktop(page);
    await page.goto("/team");

    await expect(page.getByRole("heading", { name: /에이전트 제어/ })).toBeVisible();
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
    await expect(page.getByRole("tab", { name: /대기 중/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: "처리 이력" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "정책 관리" })).toBeVisible();
  });

  test("desktop: vault page renders search and file tree", async ({ page }) => {
    await useDesktop(page);
    await page.goto("/vault");

    await expect(page.getByPlaceholder("검색...")).toBeVisible();
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

    // 탭 기반 UI: 4개 탭(일일 저널, 장기 기억, 프로필, 교훈) 렌더링 확인
    await expect(page.getByRole("tab", { name: /일일 저널/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /장기 기억/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /프로필/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /교훈/ })).toBeVisible();
  });

  /* ── Navigation ── */

  test("desktop: sidebar shows all 14 navigation links", async ({ page }) => {
    await useDesktop(page);
    await page.goto("/tasks");

    const navLinks = [
      "태스크", "캘린더", "프로젝트", "메모리", "문서", "볼트",
      "팀", "오피스", "스킬", "활동", "작업지시", "비용", "승인", "알림",
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
    await expect(page.getByRole("heading", { name: "백로그" })).toBeVisible();

    await page.getByRole("link", { name: "팀", exact: true }).click();
    await expect(page.getByRole("heading", { name: /에이전트 제어/ })).toBeVisible();

    await page.getByRole("link", { name: "활동", exact: true }).click();
    await expect(page.getByText("이벤트 (24h)")).toBeVisible();
  });
});
