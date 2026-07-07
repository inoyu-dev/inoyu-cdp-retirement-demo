import { test, expect } from "@playwright/test";
import { loginAsDemo } from "./helpers/auth";

test.describe("Visitor quiz flow", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page, "Quiz E2E");
  });

  test("completes four-step quiz and shows score", async ({ page }) => {
    await expect(page.getByText("Get your free score")).toBeVisible();

    await page.getByLabel("First name").fill("Michael");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("What worries you most?")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByRole("group", { name: "Choose how we follow up" })).toBeVisible();
    await page.locator("#email").fill("michael.e2e@example.com");
    await page.getByRole("button", { name: "Calculate my score" }).click();

    await expect(page.getByText("Your results")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Retirement readiness")).toBeVisible();
    await expect(page.getByText("Here is your score, Michael")).toBeVisible();
  });
});
