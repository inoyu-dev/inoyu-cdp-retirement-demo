import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  apiFetch,
  initVisitorContext,
  loginDemo,
  sampleQuizAnswers,
} from "../helpers/app-client.mjs";
import { ensureTestServer, stopTestServer } from "../helpers/server.mjs";

describe("Dashboard APIs", () => {
  let cookie;
  let profileId;
  let sessionId;

  before(async () => {
    await ensureTestServer();
    const login = await loginDemo("Dashboard Integration");
    cookie = login.cookie;
    const ctx = await initVisitorContext(cookie);
    cookie = ctx.cookie;
    profileId = ctx.json.profileId;
    sessionId = ctx.sessionId;

    await apiFetch("/api/events", {
      method: "POST",
      cookie,
      body: { action: "quiz", profileId, sessionId, answers: sampleQuizAnswers() },
    });
  });

  after(async () => {
    await stopTestServer();
  });

  it("lists profiles for dashboard polling", async () => {
    const res = await apiFetch("/api/profile", { cookie });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json.profiles));
    assert.ok(res.json.profiles.some((p) => p.profileId === profileId));
  });

  it("returns funnel aggregate data", async () => {
    const res = await apiFetch("/api/funnel", { cookie });
    assert.equal(res.status, 200);
    assert.ok(typeof res.json.aggregate?.totalVisitors === "number");
  });


  it("posts to dashboard agent with optional profile focus", async () => {
    const res = await apiFetch("/api/dashboard-agent", {
      method: "POST",
      cookie,
      body: {
        message: "Summarize this visitor funnel stage",
        profileId,
        sessionId,
        history: [],
      },
    });
    assert.equal(res.status, 200, JSON.stringify(res.json));
    assert.ok(typeof res.json.reply === "string");
  });
});
