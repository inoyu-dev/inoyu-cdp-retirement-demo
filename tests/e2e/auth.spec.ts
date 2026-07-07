import { test, expect } from "@playwright/test";
import { DEMO_PASSWORD, expectLoginGate, loginAsDemo } from "./helpers/auth";

test.describe("Demo login gate", () => {
  test("redirects unauthenticated visitors to login", async ({ page }) => {
    await expectLoginGate(page, "/");
    await expect(page.getByText("Demo access", { exact: true })).toBeVisible();
  });

  test("rejects invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Your name").fill("Bad Actor");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Enter demo" }).click();
    await expect(page.locator('[role="alert"]').filter({ hasText: "Invalid name or password" })).toBeVisible();
  });

  test("accepts valid demo login", async ({ page }) => {
    await loginAsDemo(page, "Auth E2E");
    await expect(page.getByText("Are you on track to retire")).toBeVisible();
  });

  test("uses configured demo password env", () => {
    expect(DEMO_PASSWORD.length).toBeGreaterThan(0);
  });
});
