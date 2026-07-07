import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveUnomiContextProfileId } from "../../src/lib/unomi-profile-id.ts";

describe("resolveUnomiContextProfileId", () => {
  it("prefers stored unomiProfileId over app profileId", () => {
    const id = resolveUnomiContextProfileId({
      profileId: "app-profile",
      unomiProfileId: "unomi-profile",
    });
    assert.equal(id, "unomi-profile");
  });

  it("falls back to app profileId when unomi id is absent", () => {
    const id = resolveUnomiContextProfileId({ profileId: "app-profile" });
    assert.equal(id, "app-profile");
  });

  it("falls back to explicit fallbackProfileId when profile is empty", () => {
    const id = resolveUnomiContextProfileId(null, "fallback-id");
    assert.equal(id, "fallback-id");
  });

  it("returns undefined when no ids are available", () => {
    assert.equal(resolveUnomiContextProfileId(null), undefined);
    assert.equal(resolveUnomiContextProfileId({ profileId: "  " }), undefined);
  });
});
