import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  VISITOR_PROFILE_COOKIE,
  VISITOR_SESSION_COOKIE,
} from "../../../scripts/app-identity.mjs";
import {
  apiFetch,
  initVisitorContext,
  loginDemo,
  parseAllSetCookies,
  sampleQuizAnswers,
} from "../helpers/app-client.mjs";
import { ensureTestServer, stopTestServer } from "../helpers/server.mjs";

describe("Visitor context cookies and profile access", () => {
  let loginCookie;
  let ctx;

  before(async () => {
    await ensureTestServer();
    const login = await loginDemo("Visitor Context Integration");
    assert.equal(login.ok, true);
    loginCookie = login.cookie;
    ctx = await initVisitorContext(loginCookie);
    assert.equal(ctx.status, 200, JSON.stringify(ctx.json));
  });

  after(async () => {
    await stopTestServer();
  });

  it("sets httpOnly visitor cookies on context init", () => {
    const set = parseAllSetCookies(ctx.headers);
    assert.equal(set[VISITOR_SESSION_COOKIE], ctx.sessionId);
    assert.equal(set[VISITOR_PROFILE_COOKIE], ctx.json.profileId);
    assert.ok(ctx.visitorCookie.includes(`${VISITOR_SESSION_COOKIE}=`));
    assert.ok(ctx.visitorCookie.includes(`${VISITOR_PROFILE_COOKIE}=`));
  });

  it("returns profileId and sessionId on context init", () => {
    assert.ok(ctx.json.profileId);
    assert.equal(ctx.json.sessionId, ctx.sessionId);
    if (ctx.json.unomiProfileId) {
      assert.equal(typeof ctx.json.unomiProfileId, "string");
    }
  });

  it("lists profiles on GET /api/profile and ignores visitor cookies", async () => {
    const res = await apiFetch("/api/profile", { cookie: ctx.cookie });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json.profiles));
    assert.equal(res.json.profile, undefined);
  });

  it("tracks events using visitor cookies when sessionId is omitted from body", async () => {
    const res = await apiFetch("/api/events", {
      method: "POST",
      cookie: ctx.cookie,
      body: {
        action: "track",
        profileId: ctx.json.profileId,
        eventType: "contentEngagement",
        properties: { topic: "social_security", dwellSeconds: 12 },
      },
    });
    assert.equal(res.status, 200, JSON.stringify(res.json));
  });

  it("starts quiz chat using visitor cookies when sessionId is omitted from body", async () => {
    const res = await apiFetch("/api/chat", {
      method: "POST",
      cookie: ctx.cookie,
      body: {
        action: "start",
        profileId: ctx.json.profileId,
        mode: "ai",
        step: 1,
        partial: { firstName: "Michael" },
      },
    });
    assert.equal(res.status, 200, JSON.stringify(res.json));
    assert.ok(Array.isArray(res.json.messages));
  });

  it("returns 400 when sessionId is missing and visitor cookies are absent", async () => {
    const res = await apiFetch("/api/chat", {
      method: "POST",
      cookie: loginCookie,
      body: { action: "start", profileId: ctx.json.profileId, mode: "ai", step: 1 },
    });
    assert.equal(res.status, 400);
    assert.match(res.json.error, /profileId and sessionId required/i);
  });

  it("returns 404 when profile lookup has no session rehydration path", async () => {
    const res = await apiFetch(
      "/api/profile?profileId=missing-profile-id-for-404-test",
      { cookie: loginCookie },
    );
    assert.equal(res.status, 404);
    assert.match(res.json.error, /not found/i);
  });

  it("returns 400 for SMS when sessionId is missing and visitor cookies are absent", async () => {
    const res = await apiFetch("/api/sms", {
      method: "POST",
      cookie: loginCookie,
      body: { action: "start", profileId: ctx.json.profileId, force: true },
    });
    assert.equal(res.status, 400);
  });

  it("starts SMS using visitor cookies when sessionId is omitted from body", async () => {
    await apiFetch("/api/events", {
      method: "POST",
      cookie: ctx.cookie,
      body: {
        action: "quiz",
        profileId: ctx.json.profileId,
        answers: sampleQuizAnswers({ firstName: "CookieSms" }),
      },
    });

    const res = await apiFetch("/api/sms", {
      method: "POST",
      cookie: ctx.cookie,
      body: { action: "start", profileId: ctx.json.profileId, force: true },
    });
    assert.equal(res.status, 200, JSON.stringify(res.json));
    assert.ok(res.json.profile?.smsThread?.length >= 1);
  });

  it("refreshes visitor cookies on mutation responses", async () => {
    const res = await apiFetch("/api/events", {
      method: "POST",
      cookie: ctx.cookie,
      body: {
        action: "track",
        profileId: ctx.json.profileId,
        eventType: "contentEngagement",
        properties: { topic: "rollover", dwellSeconds: 3 },
      },
    });
    assert.equal(res.status, 200);
    const refreshed = parseAllSetCookies(res.headers);
    assert.equal(refreshed[VISITOR_SESSION_COOKIE], ctx.sessionId);
    assert.equal(refreshed[VISITOR_PROFILE_COOKIE], ctx.json.profileId);
  });
});
