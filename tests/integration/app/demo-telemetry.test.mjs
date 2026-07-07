import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { apiFetch, loginDemo } from "../helpers/app-client.mjs";
import { ensureTestServer, stopTestServer } from "../helpers/server.mjs";

describe("Demo telemetry API", () => {
  before(async () => {
    await ensureTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  it("rejects unauthenticated telemetry", async () => {
    const res = await apiFetch("/api/demo-telemetry", {
      method: "POST",
      body: { eventType: "demoPageView", properties: { path: "/" } },
    });
    assert.equal(res.status, 401);
  });

  it("records login and page telemetry for authenticated tester", async () => {
    const login = await loginDemo("Telemetry Tester");
    assert.equal(login.ok, true);

    const pageView = await apiFetch("/api/demo-telemetry", {
      method: "POST",
      cookie: login.cookie,
      body: {
        eventType: "demoPageView",
        properties: { path: "/dashboard", browserSessionId: "test-session" },
      },
    });
    assert.equal(pageView.status, 200);
    assert.equal(pageView.json?.ok, true);

    const analytics = await apiFetch("/api/demo-analytics", { cookie: login.cookie });
    assert.equal(analytics.status, 200);
    const user = analytics.json?.users?.find((row) => row.username === "Telemetry Tester");
    assert.ok(user, "expected demo user row");
    assert.ok(user.loginCount >= 1);
    assert.ok(user.totalPageViews >= 1);
  });
});
