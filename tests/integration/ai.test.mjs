import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { aiSkipReason, shouldRunAiIntegrationTests } from "./helpers/env.mjs";
import {
  checkAiModelsEndpoint,
  getAiConfig,
  minimalAiCompletion,
  minimalAiJsonCompletion,
} from "./helpers/ai.mjs";

const skipReason = aiSkipReason();
const describeAi = skipReason ? describe.skip : describe;

describeAi("AI integration (manual — uses API tokens when completion tests run)", () => {
  it("reports AI configuration", () => {
    const config = getAiConfig();
    assert.ok(config.apiKey, "API key should be configured");
    assert.ok(config.baseUrl.startsWith("http"), "base URL should be set");
    assert.ok(config.model.length > 0, "model should be set");
  });

  it("connects to the models endpoint without completion tokens", async () => {
    const probe = await checkAiModelsEndpoint();
    assert.equal(probe.configured, true);
    assert.equal(probe.ok, true, probe.message + " (status " + probe.status + ")");
  });

  it("completes a minimal chat request", async () => {
    assert.equal(shouldRunAiIntegrationTests(), true);
    const result = await minimalAiCompletion();
    assert.equal(result.ok, true, "expected non-empty completion, status " + result.status);
    assert.ok(result.text && result.text.length > 0);
    if (result.usage) {
      console.log(
        "[ai] completion tokens used:",
        result.usage.total_tokens ?? result.usage.completion_tokens,
      );
    }
  });

  it("parses a minimal JSON completion (ai-summary shape)", async () => {
    assert.equal(shouldRunAiIntegrationTests(), true);
    const result = await minimalAiJsonCompletion();
    assert.equal(result.ok, true, "expected valid JSON headline, status " + result.status + " mode " + result.mode);
    assert.equal(typeof result.parsed.headline, "string");
    if (result.usage) {
      console.log("[ai] JSON completion tokens used (" + result.mode + "):", result.usage.total_tokens);
    }
  });
});

if (skipReason) {
  console.log("[ai] SKIP: " + skipReason);
}
