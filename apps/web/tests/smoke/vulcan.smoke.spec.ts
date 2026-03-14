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

  test("desktop: team page renders office view (default tab)", async ({ page }) => {
    await useDesktop(page);
    await page.goto("/team");

    await expect(page.getByRole("heading", { name: "에이전트 오피스" })).toBeVisible();
  });

  test("mobile: tasks page remains usable", async ({ page }) => {
    await useMobile(page);
    await page.goto("/tasks");

    await expect(page.getByText("태스크 보드")).toBeVisible();
    await expect(page.getByText("Task Live Activity")).toBeVisible();
  });

  test("mobile: vault docs tab renders search", async ({ page }) => {
    await useMobile(page);
    await page.goto("/vault?tab=docs");

    const search = page.getByPlaceholder("문서 검색...").first();
    await expect(search).toBeVisible();
    await search.fill("runbook");
    await expect(search).toHaveValue("runbook");
  });

  test("mobile: team page renders office zones", async ({ page }) => {
    await useMobile(page);
    await page.goto("/team");

    await expect(page.getByText("에이전트 오피스")).toBeVisible();
  });

  /* ── Page rendering (desktop) ── */

  test("desktop: team control tab renders agent panel", async ({ page }) => {
    await useDesktop(page);
    await page.goto("/team?tab=control");

    await expect(page.getByRole("heading", { name: /에이전트 제어/ })).toBeVisible();
  });

  test("desktop: activity page renders metric cards", async ({ page }) => {
    await useDesktop(page);
    await page.goto("/activity");

    await expect(page.getByText("이벤트 (24h)")).toBeVisible();
    await expect(page.getByText("에러")).toBeVisible();
  });

  test("desktop: team skills tab renders catalog", async ({ page }) => {
    await useDesktop(page);
    await page.goto("/team?tab=skills");

    await expect(page.getByText("스킬 관리")).toBeVisible();
    await expect(page.getByPlaceholder("스킬 검색...")).toBeVisible();
  });

  test("desktop: activity approvals tab renders pending list", async ({ page }) => {
    await useDesktop(page);
    await page.goto("/activity?tab=approvals");

    await expect(page.getByRole("tab", { name: /대기 중/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: "설정" })).toBeVisible();
  });

  test("desktop: vault page renders search and file tree", async ({ page }) => {
    await useDesktop(page);
    await page.goto("/vault");

    await expect(page.getByPlaceholder("검색...")).toBeVisible();
    await expect(page.getByPlaceholder("URL 클리핑...")).toBeVisible();
  });

  test("desktop: activity notifications tab renders categories", async ({ page }) => {
    await useDesktop(page);
    await page.goto("/activity?tab=notifications");

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

  test("desktop: sidebar shows all 7 navigation links", async ({ page }) => {
    await useDesktop(page);
    await page.goto("/tasks");

    const navLinks = [
      "태스크", "작업지시", "메모리", "볼트", "팀", "활동", "비용",
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
    await expect(page.getByRole("heading", { name: /에이전트 오피스/ })).toBeVisible();

    await page.getByRole("link", { name: "활동", exact: true }).click();
    await expect(page.getByText("이벤트 (24h)")).toBeVisible();
  });
});
