import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  apiFetch,
  initVisitorContext,
  loginDemo,
  sampleQuizAnswers,
} from "../helpers/app-client.mjs";
import { ensureTestServer, stopTestServer } from "../helpers/server.mjs";

describe("Chat and SMS APIs", () => {
  let loginCookie;
  let cookie;
  let profileId;
  let sessionId;

  before(async () => {
    await ensureTestServer();
    const login = await loginDemo("Chat SMS Integration");
    loginCookie = login.cookie;
    const ctx = await initVisitorContext(loginCookie);
    cookie = ctx.cookie;
    profileId = ctx.json.profileId;
    sessionId = ctx.sessionId;

    await apiFetch("/api/events", {
      method: "POST",
      cookie,
      body: {
        action: "quiz",
        profileId,
        sessionId,
        answers: sampleQuizAnswers(),
      },
    });
  });

  after(async () => {
    await stopTestServer();
  });

  it("requires sessionId to start quiz chat", async () => {
    const res = await apiFetch("/api/chat", {
      method: "POST",
      cookie: loginCookie,
      body: { action: "start", profileId, mode: "ai", step: 1 },
    });
    assert.equal(res.status, 400);
  });

  it("starts and replies in quiz chat with sessionId", async () => {
    const start = await apiFetch("/api/chat", {
      method: "POST",
      cookie,
      body: { action: "start", profileId, sessionId, mode: "ai", step: 1, partial: { firstName: "Michael" } },
    });
    assert.equal(start.status, 200, JSON.stringify(start.json));

    const reply = await apiFetch("/api/chat", {
      method: "POST",
      cookie,
      body: {
        action: "reply",
        profileId,
        sessionId,
        mode: "ai",
        step: 1,
        message: "Can you explain Social Security timing?",
        partial: { firstName: "Michael" },
      },
    });
    assert.equal(reply.status, 200, JSON.stringify(reply.json));
    assert.ok(Array.isArray(reply.json.messages));
  });

  it("starts SMS thread with sessionId", async () => {
    const res = await apiFetch("/api/sms", {
      method: "POST",
      cookie,
      body: { action: "start", profileId, sessionId, force: true },
    });
    assert.equal(res.status, 200, JSON.stringify(res.json));
    assert.ok(res.json.profile?.smsThread?.length >= 1);
  });

  it("replies in SMS thread with sessionId", async () => {
    const res = await apiFetch("/api/sms", {
      method: "POST",
      cookie,
      body: {
        action: "reply",
        profileId,
        sessionId,
        message: "Tell me more about my score",
        useAi: false,
      },
    });
    assert.equal(res.status, 200, JSON.stringify(res.json));
    assert.ok(res.json.profile?.smsThread?.length >= 3);
  });
});
