import { test, expect } from "@playwright/test";
import { loginAsDemo } from "./helpers/auth";

test.describe("Mobile navigation", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("opens site burger menu and navigates to how it works", async ({ page }) => {
    await loginAsDemo(page, "Mobile Nav E2E");
    await page.getByRole("button", { name: "Open menu" }).click();
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    await expect(nav).toBeVisible();
    await nav.getByRole("button", { name: "How it works" }).click();
    await expect(page).toHaveURL(/\/demo/);
  });

  test("opens dashboard burger menu on small screens", async ({ page }) => {
    await loginAsDemo(page, "Mobile Dashboard E2E");
    await page.goto("/dashboard/visitors");
    await page.getByRole("button", { name: "Open dashboard menu" }).click();
    const nav = page.getByRole("navigation", { name: "Dashboard sections" });
    await expect(nav).toBeVisible();
    await nav.locator('a[href="/dashboard/funnel"]').click();
    await expect(page).toHaveURL(/\/dashboard\/funnel/);
  });
});
