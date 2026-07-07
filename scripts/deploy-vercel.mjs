#!/usr/bin/env node
/**
 * Deploy to Vercel via CLI (production or preview).
 *
 * First-time setup:
 *   npx vercel login
 *   npx vercel link --yes
 *   npm run vercel:env:sync
 *
 * Usage:
 *   npm run deploy:vercel              # production
 *   npm run deploy:vercel:preview      # preview URL
 *   node scripts/deploy-vercel.mjs --skip-verify
 *   node scripts/deploy-vercel.mjs --skip-smoke
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const args = process.argv.slice(2);
const preview = args.includes("--preview");
const skipVerify = args.includes("--skip-verify");
const skipSmoke = args.includes("--skip-smoke");

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    stdio: "inherit",
    shell: false,
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!existsSync(".vercel/project.json")) {
  console.error("Not linked to a Vercel project. Run: npx vercel link --yes");
  process.exit(1);
}

if (!skipVerify && existsSync(".env.local")) {
  console.log("Running integration checks…");
  run("npm", ["run", "verify:integrations"]);
}

const vercelArgs = ["vercel", "deploy", "--yes"];
if (!preview) {
  vercelArgs.push("--prod");
}

console.log(preview ? "Deploying preview…" : "Deploying production…");
run("npx", vercelArgs);

if (!skipSmoke && !preview && existsSync(".env.local")) {
  console.log("\nRunning production smoke test…");
  run("npm", ["run", "test:smoke:prod"]);
}
