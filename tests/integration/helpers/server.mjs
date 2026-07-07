import { spawn } from "node:child_process";
import { DEMO_PASSWORD_DEFAULT } from "../../../scripts/app-identity.mjs";
import { once } from "node:events";

const DEFAULT_PORT = 3099;
const DEFAULT_HOST = "127.0.0.1";

let serverProcess = null;
let serverReadyPromise = null;

export function getTestPort() {
  return Number(process.env.TEST_PORT || DEFAULT_PORT);
}

export function getTestBaseUrl() {
  if (process.env.TEST_BASE_URL?.trim()) {
    return process.env.TEST_BASE_URL.replace(/\/+$/, "");
  }
  return `http://${DEFAULT_HOST}:${getTestPort()}`;
}

async function waitForServer(baseUrl, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/login`, { redirect: "manual" });
      if (res.status >= 200 && res.status < 500) return;
    } catch {
      // still starting
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`Test server did not become ready at ${baseUrl}`);
}

export function testServerEnv() {
  return {
    ...process.env,
    PORT: String(getTestPort()),
    HOSTNAME: DEFAULT_HOST,
    NODE_ENV: "production",
    DEMO_PASSWORD: process.env.DEMO_PASSWORD || DEMO_PASSWORD_DEFAULT,
    DEMO_AUTH_SECRET: process.env.DEMO_AUTH_SECRET || "e2e-test-auth-secret",
    DEMO_COOKIE_SECURE: "false",
    UNOMI_BASE_URL: "",
    OPENAI_API_KEY: "",
    OPENAI_BASE_URL: "",
    INFOMANIAK_API_TOKEN: "",
    INFOMANIAK_AI_PRODUCT_ID: "",
    INFOMANIAK_API_KEY: "",
    INFOMANIAK_AI_API_KEY: "",
  };
}

export async function ensureTestServer() {
  if (process.env.TEST_SKIP_SERVER === "1") {
    await waitForServer(getTestBaseUrl());
    return getTestBaseUrl();
  }
  if (serverReadyPromise) return serverReadyPromise;

  serverReadyPromise = (async () => {
    const baseUrl = getTestBaseUrl();
    serverProcess = spawn("npm", ["run", "start"], {
      env: testServerEnv(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    serverProcess.stdout?.on("data", (chunk) => {
      if (process.env.TEST_SERVER_VERBOSE === "1") process.stdout.write(chunk);
    });
    serverProcess.stderr?.on("data", (chunk) => {
      if (process.env.TEST_SERVER_VERBOSE === "1") process.stderr.write(chunk);
    });

    await waitForServer(baseUrl);
    return baseUrl;
  })();

  return serverReadyPromise;
}

export async function stopTestServer() {
  if (!serverProcess) return;
  serverProcess.kill("SIGTERM");
  await Promise.race([once(serverProcess, "exit"), new Promise((r) => setTimeout(r, 5000))]);
  serverProcess = null;
  serverReadyPromise = null;
}
