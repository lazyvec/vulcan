import { expect, test, type Page } from "@playwright/test";

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

async function useDesktop(page: Page) {
  await page.setViewportSize(DESKTOP);
}

async function useMobile(page: Page) {
  await page.setViewportSize(MOBILE);
}

test.describe("Vulcan Mission Control smoke (6)", () => {
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
    await expect(page.getByText("PAUSED")).toBeVisible();
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
});
