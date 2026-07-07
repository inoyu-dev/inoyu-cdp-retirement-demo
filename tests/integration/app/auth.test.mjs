import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { apiFetch, demoPassword, loginDemo } from "../helpers/app-client.mjs";
import { DEMO_PASSWORD_DEFAULT } from "../../../scripts/app-identity.mjs";
import { DEMO_SESSION_COOKIE } from "../../../scripts/app-identity.mjs";
import { ensureTestServer, stopTestServer } from "../helpers/server.mjs";

describe("Demo auth API", () => {
  before(async () => {
    await ensureTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  it("rejects unauthenticated profile API access", async () => {
    const res = await apiFetch("/api/profile");
    assert.equal(res.status, 401);
  });

  it("rejects invalid login credentials", async () => {
    const res = await apiFetch("/api/demo-auth/login", {
      method: "POST",
      body: { username: "Bad", password: "wrong-password" },
    });
    assert.equal(res.status, 401);
  });

  it("accepts valid demo login and sets session cookie", async () => {
    const login = await loginDemo("Auth Integration");
    assert.equal(login.ok, true, "login should succeed");
    assert.ok(login.cookie.includes(DEMO_SESSION_COOKIE), "expected session cookie");
    assert.equal(login.data.username, "Auth Integration");

    const health = await apiFetch("/api/integrations/health", { cookie: login.cookie });
    assert.equal(health.status, 200);
    assert.ok(health.json?.showcaseMode, "health payload should include showcaseMode");
  });

  it("uses configured demo password", () => {
    assert.equal(demoPassword(), process.env.DEMO_PASSWORD || DEMO_PASSWORD_DEFAULT);
  });
});
