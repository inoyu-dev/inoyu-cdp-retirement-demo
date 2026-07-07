#!/usr/bin/env node
/** Check production env var lengths via `vercel env run` (does not print secrets). */
import { spawnSync } from "node:child_process";

const KEYS = [
  "DEMO_PASSWORD",
  "DEMO_AUTH_SECRET",
  "INFOMANIAK_API_TOKEN",
  "INFOMANIAK_AI_PRODUCT_ID",
  "OPENAI_MODEL",
];

const probe = `console.log(JSON.stringify({${KEYS.map((k) => `${k}:(process.env.${k}||"").length`).join(",")}}));`;

const result = spawnSync(
  "npx",
  ["vercel", "env", "run", "--environment=production", "--", "node", "-e", probe],
  { encoding: "utf8" },
);

if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}

const line = (result.stdout || "").trim().split("\n").pop();
let lengths;
try {
  lengths = JSON.parse(line);
} catch {
  console.error("Could not parse env run output:", result.stdout);
  process.exit(1);
}

let ok = true;
for (const key of KEYS) {
  const len = lengths[key] ?? 0;
  const status = len > 0 ? "ok" : "MISSING";
  if (len === 0) ok = false;
  console.log(`${key}: ${status}${len ? ` (${len} chars)` : ""}`);
}

if (!ok) {
  console.error("\nSome production vars are empty. Run: npm run vercel:env:sync");
  process.exit(1);
}
console.log("\nProduction env looks populated. Redeploy if you just synced.");
