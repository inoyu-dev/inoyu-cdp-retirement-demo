import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  apiFetch,
  initVisitorContext,
  loginDemo,
  newSessionId,
  sampleQuizAnswers,
} from "../helpers/app-client.mjs";
import { ensureTestServer, stopTestServer } from "../helpers/server.mjs";

describe("Quiz API flow", () => {
  let cookie;
  let profileId;
  let sessionId;

  before(async () => {
    await ensureTestServer();
    const login = await loginDemo("Quiz Flow Integration");
    assert.equal(login.ok, true);
    cookie = login.cookie;

    const ctx = await initVisitorContext(cookie);
    assert.equal(ctx.status, 200, JSON.stringify(ctx.json));
    profileId = ctx.json.profileId;
    sessionId = ctx.sessionId;
    assert.ok(profileId);
  });

  after(async () => {
    await stopTestServer();
  });

  it("requires sessionId for context init", async () => {
    const res = await apiFetch("/api/context", {
      method: "POST",
      cookie,
      body: { utm_source: "meta" },
    });
    assert.equal(res.status, 400);
  });

  it("tracks events with sessionId", async () => {
    const res = await apiFetch("/api/events", {
      method: "POST",
      cookie,
      body: {
        action: "track",
        profileId,
        sessionId,
        eventType: "contentEngagement",
        properties: { topic: "social_security", dwellSeconds: 30 },
      },
    });
    assert.equal(res.status, 200, JSON.stringify(res.json));
  });

  it("rejects track events without sessionId", async () => {
    const res = await apiFetch("/api/events", {
      method: "POST",
      cookie,
      body: {
        action: "track",
        profileId,
        eventType: "contentEngagement",
        properties: { topic: "social_security" },
      },
    });
    assert.equal(res.status, 400);
  });

  it("submits quiz answers and returns score", async () => {
    const res = await apiFetch("/api/events", {
      method: "POST",
      cookie,
      body: {
        action: "quiz",
        profileId,
        sessionId,
        answers: sampleQuizAnswers(),
      },
    });
    assert.equal(res.status, 200, JSON.stringify(res.json));
    assert.ok(typeof res.json.profile?.quiz?.score === "number");
    assert.ok(res.json.profile.quiz.score >= 0 && res.json.profile.quiz.score <= 100);
  });

  it("loads profile with sessionId rehydration query param", async () => {
    const res = await apiFetch(
      `/api/profile?profileId=${encodeURIComponent(profileId)}&sessionId=${encodeURIComponent(sessionId)}`,
      { cookie },
    );
    assert.equal(res.status, 200);
    assert.equal(res.json.profile.profileId, profileId);
    assert.equal(res.json.profile.sessionId, sessionId);
  });

  it("returns template summary for completed profile", async () => {
    const res = await apiFetch(
      `/api/summary?profileId=${encodeURIComponent(profileId)}&sessionId=${encodeURIComponent(sessionId)}&source=template`,
      { cookie },
    );
    assert.equal(res.status, 200);
    assert.ok(res.json.summary?.headline);
  });
});
