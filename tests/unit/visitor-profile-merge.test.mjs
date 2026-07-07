import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  dedupeVisitorProfiles,
  isProfileRicher,
  mergeVisitorProfiles,
} from "../../src/lib/visitor-profile-merge.ts";

function profile(overrides = {}) {
  return {
    profileId: "profile-a",
    sessionId: "session-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    trafficSource: "direct",
    pageViews: 1,
    contentEngagement: {
      socialSecurityViews: 0,
      rolloverViews: 0,
      totalDwellSeconds: 0,
    },
    segments: [],
    leadScore: 10,
    events: [],
    smsThread: [],
    converted: false,
    ...overrides,
  };
}

describe("visitor-profile-merge", () => {
  it("prefers profiles with a completed quiz", () => {
    const incomplete = profile({ quiz: { firstName: "Ann" } });
    const completed = profile({
      profileId: "profile-b",
      quiz: { firstName: "Bob", completedAt: "2026-01-02T00:00:00.000Z", score: 72 },
    });
    assert.equal(isProfileRicher(completed, incomplete), true);
    assert.equal(isProfileRicher(incomplete, completed), false);
  });

  it("prefers profiles with a known first name when quiz completion matches", () => {
    const unnamed = profile({ updatedAt: "2026-01-03T00:00:00.000Z" });
    const named = profile({
      profileId: "profile-b",
      quiz: { firstName: "Chris" },
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    assert.equal(isProfileRicher(named, unnamed), true);
  });

  it("merges duplicate profile ids and keeps the richer quiz", () => {
    const older = profile({
      updatedAt: "2026-01-01T00:00:00.000Z",
      leadScore: 20,
      quiz: { firstName: "Dana" },
    });
    const newer = profile({
      updatedAt: "2026-01-02T00:00:00.000Z",
      leadScore: 40,
      quiz: { firstName: "Dana", completedAt: "2026-01-02T00:00:00.000Z", score: 81 },
      unomiProfileId: "unomi-123",
    });
    const merged = mergeVisitorProfiles(older, newer);
    assert.equal(merged.profileId, "profile-a");
    assert.equal(merged.unomiProfileId, "unomi-123");
    assert.equal(merged.quiz?.completedAt, "2026-01-02T00:00:00.000Z");
    assert.equal(merged.leadScore, 40);
  });

  it("dedupes duplicate profile ids", () => {
    const older = profile({
      profileId: "same-id",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const newer = profile({
      profileId: "same-id",
      sessionId: "session-2",
      updatedAt: "2026-01-02T00:00:00.000Z",
      quiz: { firstName: "Evan", completedAt: "2026-01-02T00:00:00.000Z", score: 55 },
    });
    const result = dedupeVisitorProfiles([older, newer]);
    assert.equal(result.length, 1);
    assert.equal(result[0].quiz?.firstName, "Evan");
  });

  it("dedupes duplicate session ids", () => {
    const sparse = profile({ profileId: "id-a", sessionId: "session-1" });
    const richer = profile({
      profileId: "id-b",
      sessionId: "session-1",
      quiz: { firstName: "Fran", completedAt: "2026-01-02T00:00:00.000Z", score: 60 },
    });
    const result = dedupeVisitorProfiles([sparse, richer]);
    assert.equal(result.length, 1);
    assert.equal(result[0].quiz?.firstName, "Fran");
  });
});
