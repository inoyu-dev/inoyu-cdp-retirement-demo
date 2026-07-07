import { defineConfig, devices } from "@playwright/test";
import { DEMO_PASSWORD_DEFAULT } from "./scripts/app-identity.mjs";

const port = process.env.TEST_PORT || "3100";
const baseURL = (process.env.TEST_BASE_URL || `http://127.0.0.1:${port}`).replace(/\/+$/, "");
const demoPassword = process.env.DEMO_PASSWORD || DEMO_PASSWORD_DEFAULT;
const demoAuthSecret = process.env.DEMO_AUTH_SECRET || "e2e-test-auth-secret";

/** Keep external integrations disabled so login/API routes stay fast and deterministic. */
const isolatedServerEnv = {
  PORT: port,
  HOSTNAME: "127.0.0.1",
  NODE_ENV: "production",
  DEMO_PASSWORD: demoPassword,
  DEMO_AUTH_SECRET: demoAuthSecret,
  DEMO_COOKIE_SECURE: "false",
  UNOMI_BASE_URL: "",
  OPENAI_API_KEY: "",
  OPENAI_BASE_URL: "",
  INFOMANIAK_API_TOKEN: "",
  INFOMANIAK_AI_PRODUCT_ID: "",
  INFOMANIAK_API_KEY: "",
  INFOMANIAK_AI_API_KEY: "",
};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  timeout: 60_000,
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: isolatedServerEnv,
  },
});
