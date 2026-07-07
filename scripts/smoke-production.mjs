#!/usr/bin/env node
/**
 * Lightweight post-deploy smoke test against a live Vercel deployment.
 *
 * Usage:
 *   npm run test:smoke:prod
 *   SMOKE_BASE_URL=https://your-preview.vercel.app npm run test:smoke:prod
 *   node --env-file=.env.local scripts/smoke-production.mjs --strict
 *
 * Options:
 *   --strict     Require full-live integrations (Unomi + LLM both OK)
 *   --url=<base> Override SMOKE_BASE_URL
 */

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const urlArg = args.find((entry) => entry.startsWith("--url="));
const baseUrl = (
  urlArg?.slice("--url=".length) ||
  process.env.SMOKE_BASE_URL ||
  "https://retirement.inoyu.dev"
).replace(/\/+$/, "");
const password = (process.env.DEMO_PASSWORD || "").trim();

if (!password) {
  console.error("DEMO_PASSWORD is required (set in .env.local or the environment).");
  process.exit(1);
}

function parseSetCookie(headers) {
  const raw =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : [headers.get("set-cookie")].filter(Boolean);
  return raw.map((entry) => entry.split(";")[0]).join("; ");
}

async function fetchStatus(path, { cookie, method = "GET", body } = {}) {
  const headers = {};
  if (cookie) headers.Cookie = cookie;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { status: res.status, json, text, headers: res.headers };
}

const failures = [];

function pass(label) {
  console.log(`OK  ${label}`);
}

function fail(label, detail) {
  console.error(`FAIL ${label}${detail ? `: ${detail}` : ""}`);
  failures.push(label);
}

async function expectStatus(label, path, expected, options = {}) {
  const res = await fetchStatus(path, options);
  if (res.status !== expected) {
    fail(label, `${path} returned ${res.status}, expected ${expected}`);
    return null;
  }
  pass(label);
  return res;
}

async function login() {
  const res = await fetchStatus("/api/demo-auth/login", {
    method: "POST",
    body: { username: "Deploy smoke", password },
  });
  if (res.status !== 200 || !res.json?.ok) {
    fail("demo login", res.json?.error || `status ${res.status}`);
    return null;
  }
  const cookie = parseSetCookie(res.headers);
  if (!cookie) {
    fail("demo login cookie", "no Set-Cookie header");
    return null;
  }
  pass("demo login");
  return cookie;
}

console.log(`Smoke test → ${baseUrl}${strict ? " (strict)" : ""}\n`);

await expectStatus("public login page", "/login", 200);
await expectStatus("health requires auth", "/api/integrations/health", 401);

const gate = await fetchStatus("/", { redirect: "manual" });
if (gate.status >= 300 && gate.status < 400 && gate.headers.get("location")?.includes("/login")) {
  pass("demo gate redirects unauthenticated visitors");
} else {
  fail("demo gate", `/ returned ${gate.status} without redirect to /login`);
}

const cookie = await login();
if (!cookie) {
  console.error(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}

await expectStatus("session API", "/api/demo-auth/session", 200, { cookie });

const health = await expectStatus("integrations health", "/api/integrations/health", 200, { cookie });
if (health?.json) {
  const { mode, showcaseMode, openai, unomi } = health.json;
  console.log(
    `     mode=${mode}, showcase=${showcaseMode}, llm=${openai?.ok ? "ok" : "fail"}, unomi=${unomi?.ok ? "ok" : "fail"}`,
  );
  if (strict) {
    if (showcaseMode !== "full-live" || !openai?.ok || !unomi?.ok) {
      fail(
        "strict integrations",
        `expected full-live with openai.ok and unomi.ok, got showcase=${showcaseMode}`,
      );
    } else {
      pass("strict integrations (full-live)");
    }
  }
}

const pages = [
  ["/", "visitor landing"],
  ["/demo", "how it works"],
  ["/dashboard", "dashboard overview"],
  ["/dashboard/visitors", "dashboard visitors"],
  ["/dashboard/funnel", "dashboard funnel"],
  ["/dashboard/demo-usage", "dashboard demo usage"],
  ["/dashboard/tools", "dashboard tools"],
];

for (const [path, label] of pages) {
  const res = await expectStatus(label, path, 200, { cookie });
  if (res && !res.headers.get("content-type")?.includes("text/html")) {
    fail(label, `${path} did not return HTML`);
  }
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}

console.log("\nProduction smoke passed.");
