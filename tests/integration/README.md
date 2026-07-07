# Integration tests

HTTP-level integration tests for Apache Unomi, OpenAI-compatible LLM APIs, app API routes, and Playwright E2E flows.

## Commands

```bash
# Unomi — safe for CI (skips when UNOMI_BASE_URL is unset)
npm run test:integration

# Local dev (loads .env.local)
npm run test:integration:local

# App API routes against production build (starts local server on :3099)
npm run test:app:integration:local

# Playwright E2E (builds app, runs browser tests)
npm run test:e2e:install   # first time only
npm run test:e2e

# Full local verification before deploy
npm run test:all:local

# Pure lib unit tests (no server)
npm run test:unit

# AI tests — skipped unless RUN_AI_INTEGRATION_TESTS=1 (never run in CI)
RUN_AI_INTEGRATION_TESTS=1 npm run test:integration:ai:local

# Both Unomi + AI suites locally
npm run test:integration:all
```

## Test layout

| Path | What it covers |
|------|----------------|
| `tests/integration/unomi.test.mjs` | Unomi CDP event sync |
| `tests/integration/ai.test.mjs` | LLM API (manual only) |
| `tests/integration/app/*.test.mjs` | Login, quiz API, chat/SMS, dashboard APIs, demo telemetry, visitor context cookies (29 tests) |
| `tests/unit/*.test.mjs` | Profile merge/dedupe, Unomi id resolution, structured logging (11 tests) |
| `tests/e2e/*.spec.ts` | Browser flows: login, quiz, dashboard, demo page, mobile nav (11 tests × chromium + mobile-chrome locally) |

## CI policy

| Suite | CI | Tokens |
|-------|-----|--------|
| Unomi (`unomi.test.mjs`) | Runs when `UNOMI_BASE_URL` secret is set; otherwise skips | None |
| App API (`app/*.test.mjs`) | Always — uses local server, no external deps | None |
| Playwright E2E | Always — Chromium only in CI | None |
| AI (`ai.test.mjs`) | **Never** — blocked unless `RUN_AI_INTEGRATION_TESTS=1` | Manual only (~100 tokens) |

## Environment

App and E2E tests use these defaults when unset:

- `TEST_PORT=3099`
- `DEMO_PASSWORD=inoyu-demo-local`
- `DEMO_AUTH_SECRET=e2e-test-auth-secret`

Set `TEST_SKIP_SERVER=1` and `TEST_BASE_URL` to point at an already-running server.

Legacy verify scripts:

- `npm run test:smoke:prod` — post-deploy smoke against production URL
- `npm run verify:integrations` — quick connectivity
- `npm run verify:unomi` — detailed Unomi event audit
- `npm run cleanup:unomi  # scope inoyu-cdp-retirement` — dry-run scoped delete of legacy/noise Unomi profiles (add `--execute` via `cleanup:unomi:execute`)

## Notes

- App integration tests pass explicit `sessionId` in JSON bodies by default; `visitor-context.test.mjs` also exercises httpOnly visitor cookie fallbacks.
- Demo usage page lives at `/dashboard/demo-usage` (direct URL only — not in dashboard nav).
