import { test, expect, type Page } from "@playwright/test";
import { loginAsDemo } from "./helpers/auth";

async function openDashboardNav(page: Page) {
  const menu = page.getByRole("button", { name: "Open dashboard menu" });
  if (await menu.isVisible()) {
    await menu.click();
  }
}

async function clickDashboardSection(page: Page, href: string) {
  await openDashboardNav(page);
  const nav = page.getByRole("navigation", { name: "Dashboard sections" });
  await nav.locator(`a[href="${href}"]`).click();
}

async function expectVisibleBadge(page: Page, pattern: RegExp) {
  const badges = page.locator('[data-slot="badge"]');
  await expect(badges.filter({ hasText: pattern }).locator("visible=true").first()).toBeVisible();
}

test.describe("Marketing dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page, "Dashboard E2E");
  });

  test("loads overview and navigates core sections", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();

    await clickDashboardSection(page, "/dashboard/visitors");
    await expect(page).toHaveURL(/\/dashboard\/visitors/);
    await expect(page.getByRole("heading", { name: "Visitors" })).toBeVisible();

    await clickDashboardSection(page, "/dashboard/funnel");
    await expect(page).toHaveURL(/\/dashboard\/funnel/);
    await expect(page.getByRole("heading", { name: "Quiz funnel" })).toBeVisible();

    await clickDashboardSection(page, "/dashboard/experiments");
    await expect(page).toHaveURL(/\/dashboard\/experiments/);

    await clickDashboardSection(page, "/dashboard/tools");
    await expect(page).toHaveURL(/\/dashboard\/tools/);
    await expect(page.getByRole("heading", { name: "AI & tools" })).toBeVisible();
  });

  test("shows integration health bar on dashboard", async ({ page }) => {
    const healthReady = page.waitForResponse(
      (res) => res.url().includes("/api/integrations/health") && res.ok(),
    );
    await page.goto("/dashboard");
    await healthReady;
    await expect(page.locator("#main-content").getByText("Marketing dashboard")).toBeVisible();
    await expectVisibleBadge(page, /Unomi (mocked locally|connected|error)/);
    await expectVisibleBadge(page, /^LLM (connected|templates)$/);
  });
});
