import { DEMO_PASSWORD_DEFAULT } from "../../../src/lib/app-identity";

import { expect, type Page } from "@playwright/test";

export const DEMO_PASSWORD = process.env.DEMO_PASSWORD || DEMO_PASSWORD_DEFAULT;

export async function loginAsDemo(page: Page, username = "E2E Tester") {
  const response = await page.request.post("/api/demo-auth/login", {
    data: { username, password: DEMO_PASSWORD },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  await page.goto("/");
  await expect(page).not.toHaveURL(/\/login/);
}

export async function expectLoginGate(page: Page, fromPath = "/") {
  await page.goto(fromPath);
  await expect(page).toHaveURL(/\/login/);
}
