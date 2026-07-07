import { test, expect } from "@playwright/test";
import { loginAsDemo } from "./helpers/auth";

test.describe("How it works page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page, "Demo Page E2E");
  });

  test("renders product walkthrough content", async ({ page }) => {
    await page.goto("/demo");
    await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
    await expect(page.getByText("Product walkthrough")).toBeVisible();
    await expect(page.getByText("Mobile-friendly")).toBeVisible();
    await expect(page.getByText("The six steps")).toBeVisible();
  });

  test("links to quiz and dashboard from walkthrough", async ({ page }) => {
    await page.goto("/demo");
    await expect(page.getByRole("button", { name: /Start visitor quiz/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Open marketing dashboard/ })).toBeVisible();
  });
});
