import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { logApiError, sanitizeLogContext } from "../../src/lib/logger.ts";

describe("logger", () => {
  it("redacts sensitive keys in log context", () => {
    const sanitized = sanitizeLogContext({
      profileId: "abc",
      password: "secret",
      authToken: "token-value",
      nested: { ok: true },
    });
    assert.equal(sanitized.profileId, "abc");
    assert.equal(sanitized.password, "[redacted]");
    assert.equal(sanitized.authToken, "[redacted]");
  });

  it("emits structured api errors", () => {
    const errorSpy = mock.method(console, "error", () => {});
    logApiError("test-route", new Error("boom"), { profileId: "p1" });
    assert.equal(errorSpy.mock.callCount(), 1);
    const [prefix, payload] = errorSpy.mock.calls[0].arguments;
    assert.match(prefix, /test-route/);
    assert.equal(payload.scope, "api/test-route");
    assert.equal(payload.level, "error");
    assert.equal(payload.profileId, "p1");
    errorSpy.mock.restore();
  });
});
