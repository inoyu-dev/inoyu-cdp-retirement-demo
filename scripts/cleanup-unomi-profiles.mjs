#!/usr/bin/env node
/**
 * Scoped Apache Unomi profile cleanup for the Inoyu CDP retirement demo scope.
 *
 * Deletes legacy/noise profiles only — never wipes the whole cluster.
 * Default is dry-run; pass --execute to apply deletes.
 *
 * Usage:
 *   node --env-file=.env.local scripts/cleanup-unomi-profiles.mjs
 *   node --env-file=.env.local scripts/cleanup-unomi-profiles.mjs --execute
 *   node --env-file=.env.local scripts/cleanup-unomi-profiles.mjs --include-sparse --execute
 *
 * Requires UNOMI_BASE_URL + admin credentials (UNOMI_USERNAME/PASSWORD).
 */
import { UNOMI_PROFILE_JSON_KEY, UNOMI_SOURCE_VISITOR, resolveUnomiScope } from "./app-identity.mjs";

import { UNOMI_PROFILE_JSON_KEY, resolveUnomiScope } from "./app-identity.mjs";

const args = process.argv.slice(2);
const execute = args.includes("--execute");
const includeSparse = args.includes("--include-sparse");
const includeIntegration = args.includes("--include-integration");
const verbose = args.includes("--verbose");
const limitArg = args.find((a) => a.startsWith("--limit="));
const deleteLimit = limitArg ? Number.parseInt(limitArg.split("=")[1], 10) : Infinity;

const unomiBase = (process.env.UNOMI_BASE_URL || "").replace(/\/+$/, "");
const scope = resolveUnomiScope();
const user = process.env.UNOMI_USERNAME || "karaf";
const adminPass = process.env.UNOMI_PASSWORD || "karaf";

const VISITOR_PROFILE_KIND = "visitor_session";
const DEMO_PROFILE_KIND = "demo_tester";
const PROFILE_JSON_KEY = UNOMI_PROFILE_JSON_KEY;
const PAGE_SIZE = 100;

function headers() {
  const h = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: "Basic " + Buffer.from(user + ":" + adminPass).toString("base64"),
  };
  if (process.env.UNOMI_TENANT_PUBLIC_TOKEN) {
    h["X-Unomi-Api-Key"] = process.env.UNOMI_TENANT_PUBLIC_TOKEN;
  }
  return h;
}

function parseStoredProfile(raw) {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.profileId !== "string" || typeof parsed.sessionId !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

function isIntegrationNoise(parsed, props) {
  if (!parsed) return false;
  const sessionId = parsed.sessionId || props.visitorSessionId || "";
  const prefixes = [
    "integration-",
    "verify-events-",
    "connectivity-",
    "integration-probe-",
    "integration-test",
  ];
  return prefixes.some((p) => sessionId.startsWith(p) || sessionId.includes(p));
}

function classifyProfile(row) {
  const props = row.properties ?? {};
  const itemId = row.itemId || row.systemProperties?.itemId;
  if (!itemId) return { action: "skip", reason: "missing_item_id" };

  const profileKind = props.profileKind;
  const blob = props[PROFILE_JSON_KEY];
  const parsed = parseStoredProfile(blob);

  if (profileKind === DEMO_PROFILE_KIND) {
    return { action: "keep", reason: "demo_tester", itemId };
  }

  if (profileKind === VISITOR_PROFILE_KIND) {
    if (!parsed) {
      return { action: "delete", reason: "visitor_session_missing_blob", itemId, props };
    }
    if (includeIntegration && isIntegrationNoise(parsed, props)) {
      return { action: "delete", reason: "integration_test_fixture", itemId, props, parsed };
    }
    if (parsed.quiz?.score === 99 && !parsed.quiz?.firstName?.trim()) {
      return { action: "delete", reason: "synthetic_test_fixture", itemId, props, parsed };
    }
    const hasRichQuiz = Boolean(parsed.quiz?.completedAt || parsed.quiz?.firstName?.trim());
    if (!hasRichQuiz && includeSparse) {
      return { action: "delete", reason: "sparse_visitor_session", itemId, props, parsed };
    }
    return { action: "keep", reason: hasRichQuiz ? "visitor_session_rich" : "visitor_session_blob", itemId, parsed };
  }

  if (!profileKind && !blob) {
    return { action: "delete", reason: "legacy_context_only", itemId, props };
  }

  if (parsed) {
    if (includeIntegration && isIntegrationNoise(parsed, props)) {
      return { action: "delete", reason: "integration_test_fixture", itemId, props, parsed };
    }
    return { action: "keep", reason: "unindexed_visitor_blob", itemId, parsed };
  }

  return { action: "keep", reason: profileKind ? `unknown_kind:${profileKind}` : "unclassified", itemId };
}

async function fetchProfilesPage(offset) {
  const res = await fetch(unomiBase + "/cxs/profiles/search", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      offset,
      limit: PAGE_SIZE,
      sortby: "lastVisit:desc",
      condition: { type: "matchAllCondition" },
    }),
  });
  if (!res.ok) {
    throw new Error(`Profile search failed: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  return res.json();
}

async function listAllProfiles() {
  const first = await fetchProfilesPage(0);
  const total = first.totalSize ?? first.list?.length ?? 0;
  const rows = [...(first.list ?? [])];
  for (let offset = PAGE_SIZE; offset < total; offset += PAGE_SIZE) {
    const page = await fetchProfilesPage(offset);
    rows.push(...(page.list ?? []));
  }
  return { total, rows };
}

async function deleteProfile(itemId) {
  const res = await fetch(unomiBase + "/cxs/profiles/" + encodeURIComponent(itemId), {
    method: "DELETE",
    headers: headers(),
  });
  return { ok: res.ok, status: res.status, body: (await res.text()).slice(0, 200) };
}

function summarizeRow(entry) {
  const props = entry.props ?? {};
  const parsed = entry.parsed;
  return {
    itemId: entry.itemId,
    reason: entry.reason,
    profileKind: props.profileKind ?? null,
    visitorProfileId: props.visitorProfileId ?? parsed?.profileId ?? null,
    visitorSessionId: props.visitorSessionId ?? parsed?.sessionId ?? null,
    firstName: parsed?.quiz?.firstName ?? props.firstName ?? null,
    quizCompleted: Boolean(parsed?.quiz?.completedAt ?? props.quizCompleted),
  };
}

function printBucket(title, entries) {
  console.log(`\n${title} (${entries.length})`);
  const sample = entries.slice(0, 20).map(summarizeRow);
  for (const row of sample) {
    console.log(
      `  - ${row.itemId} | ${row.reason} | kind=${row.profileKind ?? "-"} | profile=${row.visitorProfileId ?? "-"} | session=${row.visitorSessionId ?? "-"}`,
    );
  }
  if (entries.length > sample.length) {
    console.log(`  … and ${entries.length - sample.length} more`);
  }
}

async function main() {
  if (!unomiBase) {
    console.error("UNOMI_BASE_URL is not set.");
    process.exit(1);
  }

  console.log("Unomi profile cleanup");
  console.log(`  base: ${unomiBase}`);
  console.log(`  scope: ${scope}`);
  console.log(`  mode: ${execute ? "EXECUTE (destructive)" : "dry-run"}`);
  console.log(`  flags: sparse=${includeSparse} integration=${includeIntegration}`);

  const admin = await fetch(unomiBase + "/cxs/profiles/count", { headers: headers() });
  if (!admin.ok) {
    console.error(`Admin API unreachable: HTTP ${admin.status}`);
    process.exit(1);
  }

  const { total, rows } = await listAllProfiles();
  console.log(`\nIndexed profiles: ${total} (fetched ${rows.length})`);

  const keep = [];
  const toDelete = [];
  const skipped = [];

  for (const row of rows) {
    const verdict = classifyProfile(row);
    const entry = { ...verdict, props: row.properties, parsed: verdict.parsed };
    if (verdict.action === "delete") toDelete.push(entry);
    else if (verdict.action === "keep") keep.push(entry);
    else skipped.push(entry);
  }

  const byReason = toDelete.reduce((acc, row) => {
    acc[row.reason] = (acc[row.reason] ?? 0) + 1;
    return acc;
  }, {});

  console.log("\nSummary");
  console.log(`  keep: ${keep.length}`);
  console.log(`  delete candidates: ${toDelete.length}`);
  console.log(`  skipped: ${skipped.length}`);
  if (Object.keys(byReason).length) {
    console.log("  delete by reason:");
    for (const [reason, count] of Object.entries(byReason).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${reason}: ${count}`);
    }
  }

  printBucket("Delete candidates", toDelete);
  if (verbose) printBucket("Keeping", keep);

  const planned = toDelete.slice(0, Number.isFinite(deleteLimit) ? deleteLimit : toDelete.length);
  if (!planned.length) {
    console.log("\nNothing to delete.");
    return;
  }

  if (!execute) {
    console.log(`\nDry run only. Re-run with --execute to delete ${planned.length} profile(s).`);
    console.log("Optional flags: --include-sparse --include-integration --limit=50 --verbose");
    return;
  }

  console.log(`\nDeleting ${planned.length} profile(s)...`);
  let deleted = 0;
  let failed = 0;
  for (const entry of planned) {
    const result = await deleteProfile(entry.itemId);
    if (result.ok) {
      deleted += 1;
      console.log(`  OK deleted ${entry.itemId} (${entry.reason})`);
    } else {
      failed += 1;
      console.error(`  FAIL ${entry.itemId} (${entry.reason}) HTTP ${result.status} ${result.body}`);
    }
  }

  const after = await fetch(unomiBase + "/cxs/profiles/count", { headers: headers() });
  const afterCount = after.ok ? await after.json() : "?";
  console.log(`\nDone. deleted=${deleted} failed=${failed} remaining≈${afterCount}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
