import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { unomiSkipReason } from "./helpers/env.mjs";
import {
  checkUnomiAdmin,
  checkUnomiContextEmpty,
  getUnomiProfile,
  ingestSampleEvents,
  searchUnomiEvents,
  searchUnomiProfiles,
} from "./helpers/unomi.mjs";

const skipReason = unomiSkipReason();
const describeUnomi = skipReason ? describe.skip : describe;

describeUnomi("Unomi integration", () => {
  let ingest;

  it("connects to admin API", async () => {
    const admin = await checkUnomiAdmin();
    assert.equal(admin.ok, true, "expected /cxs/profiles/count HTTP 200, got " + admin.status);
  });

  it("accepts empty context requests", async () => {
    const ctx = await checkUnomiContextEmpty();
    assert.equal(ctx.ok, true, "expected context API HTTP 200, got " + ctx.status);
  });

  it("accepts sample app event types via context.json", async () => {
    ingest = await ingestSampleEvents();
    assert.equal(ingest.failures.length, 0, "event HTTP failures: " + JSON.stringify(ingest.failures));
    assert.ok(ingest.unomiProfileId, "expected Unomi to return a profileId");
  });

  it("retrieves the profile created during ingestion", async () => {
    if (!ingest?.unomiProfileId) ingest = await ingestSampleEvents();
    const profile = await getUnomiProfile(ingest.unomiProfileId);
    assert.equal(profile.ok, true, "expected profile GET HTTP 200, got " + profile.status);
    assert.ok(profile.data?.itemId, "profile payload should include itemId");
  });

  it("searches profiles via admin API", async () => {
    const search = await searchUnomiProfiles();
    assert.equal(search.ok, true, "expected profile search HTTP 200, got " + search.status);
    assert.ok((search.data?.totalSize ?? 0) >= 1, "expected at least one profile in index");
  });

  it("event search API responds (indexing may be empty on some servers)", async () => {
    if (!ingest?.unomiProfileId) ingest = await ingestSampleEvents();
    const events = await searchUnomiEvents(ingest.unomiProfileId);
    assert.equal(events.ok, true, "expected event search HTTP 200, got " + events.status);
    // Do not assert totalSize > 0 — known gap on test-cdp.inoyu.dev event indexing.
    if ((events.data?.totalSize ?? 0) === 0 && (ingest.processedTotal ?? 0) === 0) {
      console.warn(
        "[unomi] WARN: processedEvents=0 and event search empty — server may not index events yet",
      );
    }
  });
});

if (skipReason) {
  console.log("[unomi] SKIP: " + skipReason);
}
