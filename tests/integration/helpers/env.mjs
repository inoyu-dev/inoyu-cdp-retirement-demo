/**
 * Shared env helpers for integration tests.
 * Load with: node --env-file=.env.local --test tests/integration/...
 */

export function isCi() {
  return process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
}

export function shouldRunAiIntegrationTests() {
  return process.env.RUN_AI_INTEGRATION_TESTS === "1";
}

export function isUnomiConfigured() {
  return Boolean((process.env.UNOMI_BASE_URL || "").trim());
}

export function isAiConfigured() {
  return Boolean(
    (process.env.INFOMANIAK_API_TOKEN || process.env.OPENAI_API_KEY || "").trim(),
  );
}

/** Skip reason when Unomi env is missing (CI-safe). */
export function unomiSkipReason() {
  if (isUnomiConfigured()) return null;
  return "UNOMI_BASE_URL not set — skipping Unomi integration tests";
}

/** Skip reason for AI tests — never run in CI unless explicitly forced (not recommended). */
export function aiSkipReason() {
  if (isCi() && !shouldRunAiIntegrationTests()) {
    return "AI integration tests are disabled in CI (set RUN_AI_INTEGRATION_TESTS=1 locally to run)";
  }
  if (!shouldRunAiIntegrationTests()) {
    return "Set RUN_AI_INTEGRATION_TESTS=1 to run AI integration tests (uses a few API tokens)";
  }
  if (!isAiConfigured()) {
    return "INFOMANIAK_API_TOKEN or OPENAI_API_KEY not set";
  }
  return null;
}
