#!/usr/bin/env node
/**
 * Push non-empty variables from .env.local to Vercel (production + preview).
 * Requires: npx vercel login && npx vercel link --yes
 *
 * Usage: npm run vercel:env:sync
 */

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const ENV_FILE = ".env.local";
const TARGETS = ["production", "preview"];

/** Vars safe to sync for this app (skip empty values). */
const ALLOWLIST = new Set([
  "DEMO_PASSWORD",
  "DEMO_AUTH_SECRET",
  "INFOMANIAK_API_TOKEN",
  "INFOMANIAK_AI_PRODUCT_ID",
  "OPENAI_MODEL",
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "OPENAI_AUTH_SCHEME",
  "OPENAI_API_VERSION",
  "OPENAI_COST_INPUT_PER_MTOK",
  "OPENAI_COST_OUTPUT_PER_MTOK",
  "UNOMI_BASE_URL",
  "UNOMI_SCOPE",
  "UNOMI_VERSION",
  "UNOMI_USERNAME",
  "UNOMI_PASSWORD",
  "UNOMI_TENANT_PUBLIC_TOKEN",
  "UNOMI_CONTEXT_USE_ADMIN_AUTH",
  "UNOMI_DEBUG",
  "DEMO_COUNTRY_CODE",
]);

function parseEnvFile(path) {
  const vars = new Map();
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value) vars.set(key, value);
  }
  return vars;
}

function addEnv(name, value, target) {
  const result = spawnSync(
    "npx",
    [
      "vercel",
      "env",
      "add",
      name,
      target,
      "--value",
      value,
      "--force",
      "--sensitive",
      "--yes",
    ],
    { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" },
  );
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "").trim();
    console.error(`Failed to set ${name} for ${target}${err ? `: ${err}` : ""}`);
    process.exit(result.status ?? 1);
  }
}

if (!existsSync(".vercel/project.json")) {
  console.error("Not linked. Run: npx vercel link --yes");
  process.exit(1);
}

if (!existsSync(ENV_FILE)) {
  console.error(`Missing ${ENV_FILE}. Copy from .env.example first.`);
  process.exit(1);
}

const vars = parseEnvFile(ENV_FILE);
let synced = 0;

for (const [key, value] of vars) {
  if (!ALLOWLIST.has(key)) continue;
  for (const target of TARGETS) {
    console.log(`Setting ${key} → ${target} (${value.length} chars)`);
    addEnv(key, value, target);
    synced += 1;
  }
}

console.log(`\nSynced ${synced} env entries (${vars.size} keys read from ${ENV_FILE}).`);
console.log("\nNote: vercel env pull shows empty strings for sensitive vars — that is normal.");
console.log("Verify lengths: npm run vercel:env:verify");
console.log("Then redeploy: npm run deploy:vercel -- --skip-verify");
