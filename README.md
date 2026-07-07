# Inoyu CDP Retirement Demo

Inoyu CDP demo: Apache Unomi + AI + omnichannel follow-up on a FinPub retirement quiz scenario.

**Live demo:** [retirement.inoyu.dev](https://retirement.inoyu.dev) · **Repository:** [github.com/inoyu-dev/inoyu-cdp-retirement-demo](https://github.com/inoyu-dev/inoyu-cdp-retirement-demo)

End-to-end demo: **Apache Unomi** event capture (Inoyu-compatible), **AI profile intelligence**, and **omnichannel follow-up** grounded in real visitor intent.

Part of the [Inoyu CDP demos](https://inoyu.dev/) portfolio. Monorepo path: `inoyu/cdp/demos/inoyu-cdp-retirement-demo`. Built on patterns from [Inoyu.dev](https://inoyu.dev/) — open Apache Unomi core, privacy-first profiles, AI-ready context.

| | |
|---|---|
| **Package / repo** | `inoyu-cdp-retirement-demo` |
| **Unomi scope** | `inoyu-cdp-retirement` |
| **License** | [MIT](LICENSE) |


---

## Technical stack (privacy-first)

| Layer | Technology | Role |
|-------|------------|------|
| **Frontend** | [Vercel](https://vercel.com/) + Next.js | Visitor quiz, dashboard, serverless API routes, demo gate |
| **CDP** | [Apache Unomi](https://unomi.apache.org/) on **Infomaniak managed Kubernetes** | First-party profiles, events, segments — data stays in your scope |
| **AI** | [Infomaniak AI Tools](https://www.infomaniak.com/en/hosting/ai-tools) | EU-hosted OpenAI-compatible inference; **does not retain prompts or outputs** for training |
| **Patterns** | [Inoyu.dev](https://inoyu.dev/) | Unomi integration, MCP-style dashboard agent, reference architecture |

**Privacy benefits:** no ad-platform CDP lock-in; on-demand LLM only; explicit channel opt-in; full event audit trail in Unomi; stateless AI calls with optional profile caching you control. Production URL: `https://retirement.inoyu.dev`.

---

## What does this tool do?

Captures visitor behavior on a FinPub retirement quiz (Unomi events), builds a unified lead profile with segments and lead score, generates an **AI brief and personalized next steps** for visitors and media buyers, and routes each visitor to their **chosen follow-up channel** — email, SMS, WhatsApp, LINE, phone callback, browser push, or on-page results only.

## Why this demo?

Paid media ROI in financial publishing depends on connecting **ad click behavior** to **qualified conversations**. This demo closes that loop: paid traffic → engagement signals → scored segment → channel-of-choice follow-up.

## Roadmap

Planned enhancements beyond this reference demo:


1. **Real outbound channels** — Wire email (SendGrid/SES), SMS (Trackly/Twilio), WhatsApp Business, and LINE Official Account APIs so follow-up UIs send actual messages instead of in-app previews.
2. **Ad platform MCP loop** — Connect Meta, Taboola, and Google ad workflows to Unomi segments; auto-sync qualified leads and report cost-per-qualified-conversation by `utm_source` and `contactChannel`.
3. **External Unomi MCP connector** — Expose the in-process dashboard agent tools as a standalone MCP server for other agents and ops tooling.
4. **Experimentation at scale** — Ship winning quiz variants to traffic automatically; tie experiment stats to paid-media cohorts in the dashboard.
5. **Compliance & ops** — Consent audit trail export, human handoff queue for “Talk to a human”, and scheduled callback integration (Calendly/CRM) for phone opt-ins.
6. **Ops hardening** — Register all event schemas on Unomi, durable experiment state (Redis/Postgres), and automated demo-usage alerts for sales prospects.

---

## Two product surfaces

| Surface | Route | Who |
|---------|-------|-----|
| **Visitor quiz** | `/` | Pre-retiree — plain language, 4 steps, channel of choice |
| **Marketing dashboard** | `/dashboard` | Media buyer — live profiles, segments, AI brief, timeline |

Product walkthrough and operator instructions live only on **`/demo` (How it works)** — not on the visitor or dashboard UX.

---

## Latest features (July 2026)

### Visitor experience

- **4-step retirement quiz** with progress, step rewards, and completion celebration
- **On-demand AI** — Step 4 results summary, dashboard brief, in-quiz chat, SMS replies (template fallback when LLM unavailable)
- **In-quiz help chat** — contextual Q&A per step, synced to Unomi when configured
- **Step willingness analytics** — idle time, typing patterns, focus changes → engagement score sent as CDP events
- **Visitor identity** — stable `sessionId` in localStorage + httpOnly cookies; API routes fall back to cookies when body omits ids
- **Channel-of-choice opt-in** — email, SMS, WhatsApp, LINE, phone, browser push, or on-page only
- **Multi-language UI** — English, Spanish, Chinese, French, Japanese (header selector)
- **Mobile-first layout** — responsive quiz fields, stacked follow-up cards, burger site nav

### Marketing dashboard

| Section | Route | Highlights |
|---------|-------|------------|
| **Overview** | `/dashboard` | Live KPIs, traffic mix, marketing charts |
| **Visitors** | `/dashboard/visitors` | Profile list, rich profile detail (hero, attributes, engagement, journey timeline), AI brief |
| **Funnel** | `/dashboard/funnel` | Step drop-offs, AI friction analysis |
| **Experiments** | `/dashboard/experiments` | Quiz A/B variants — propose, approve, reject |
| **AI & tools** | `/dashboard/tools` | Token cost panel, Unomi dashboard agent chat, SMS simulator |

- **Live polling** — profiles refresh every 2s
- **Integration status bar** — Unomi + LLM connectivity badges
- **Mobile dashboard nav** — burger menu on small screens

### Platform & ops

- **Demo gate** — shared-password login; per-tester name for silent usage analytics
- **Local Unomi-compatible mock** — `.data/profiles.json` when remote CDP unavailable
- **Infomaniak AI** default LLM provider; any OpenAI-compatible API supported
- **Vercel deploy scripts** — `npm run deploy:vercel`, env sync, integration verify
- **Test suite** — Unomi integration, app API integration, Playwright E2E (see [Testing](#testing))


---

## Implementation status

The dashboard **Integration status bar** (`/dashboard`) reflects runtime mode: **Live demo**, **Hybrid live** (AI live + local CDP mock), or **Local fallback** (templates + mock). See `GET /api/integrations/health`.

### Fully implemented (production-ready code paths)

| Area | What works today |
|------|------------------|
| **Demo gate & usage tracking** | Shared-password login; silent telemetry to local store + Unomi (`demo_platform`); usage at `/dashboard/demo-usage` (direct URL, not in main nav) |
| **Visitor quiz** | 4-step flow, scoring, segments, step willingness analytics, `sessionId` on every API call |
| **Event pipeline** | Same routes and event types for local store and remote Unomi (`view`, `contentEngagement`, `quizCompleted`, step/chat/SMS events, `demo_platform`) |
| **Apache Unomi integration** | `POST …/cxs/context.json`, profile sync, health checks — **when `UNOMI_BASE_URL` is set and reachable** |
| **Marketing dashboard** | Overview, visitors (rich profile UI), funnel, experiments, AI & tools; 2s polling |
| **Quiz experiments** | Propose / approve / reject variants; stats from real visitor profiles |
| **AI features** | Summaries, in-quiz chat, SMS replies, funnel analysis, dashboard agent — **when LLM API is configured**; static “Did you know?” tips; template fallbacks always available |
| **Dashboard CDP agent** | MCP-style tools (`unomi_get_profile`, `unomi_search_events`, `unomi_aggregate`, …) querying local or remote data |
| **Follow-up UX** | Channel-specific pages for email, SMS, WhatsApp, LINE, phone callback, browser push, on-page |
| **SMS / chat logic** | Threading, conversion keyword detection, Unomi event mirroring — in-app, not carrier APIs |
| **i18n & mobile** | 5 locales; responsive quiz, dashboard, and burger navigation |
| **Geo / region** | Country from Vercel/Cloudflare IP headers (or `DEMO_COUNTRY_CODE`); region-aware channel lists |
| **Testing & deploy** | Unomi + app API + Playwright E2E tests; Vercel deploy and env sync scripts |

### Mocked or simulated (by design for local development)

| Area | Current behavior | Becomes live when… |
|------|------------------|-------------------|
| **CDP storage** | Local Unomi-compatible JSON store (`.data/profiles.json`); **in-memory only on Vercel** | `UNOMI_BASE_URL` + durable remote Unomi (or external DB on serverless) |
| **Remote Unomi host (offline dev)** | Local JSON mock when `UNOMI_BASE_URL` unset | Production uses Infomaniak managed K8s (`test-cdp.inoyu.dev`) — see `docs/DEPLOYMENT.md` |
| **LLM copy** | Deterministic templates when no API token | `INFOMANIAK_*` or `OPENAI_*` configured |
| **Email follow-up** | Inbox preview UI; no message sent | ESP integration (SendGrid, SES, …) |
| **SMS / WhatsApp / LINE** | In-app chat simulation; events logged to profile + Unomi | Trackly, Twilio, WhatsApp Business, LINE APIs |
| **Phone callback** | Thank-you page + time-slot picker; no dialer/CRM | Scheduling or telephony integration |
| **Marketer SMS simulator** | Dashboard tool replays scenarios for buyers | Same as real SMS provider above |
| **Quiz live chart** | Illustrative savings projection from quiz inputs | Optional: live market/fees data feed |
| **AI token costs** | Estimates from configured $/MTok rates | Billing API from LLM provider |
| **External MCP server** | Tools run in-process in Next.js | Standalone MCP connector package |
| **Ad platform sync** | UTM capture only; no Meta/Taboola/Google APIs | MCP ad workflows + Unomi segments |

### Hybrid (partially real)

| Feature | Real part | Simulated part |
|---------|-----------|----------------|
| **Browser push** | Uses browser `Notification` API when user grants permission | Preview card when unsupported or denied |
| **Dashboard agent** | LLM + tool calls when AI configured; queries remote Unomi when connected | Template replies; local mock CDP when Unomi unset |
| **Unomi MCP tools** | Admin REST queries when Unomi live | Falls back to local profile/event store |

---

## Quick start

```bash
cp .env.example .env.local   # demo gate, Unomi, Infomaniak AI — see below
npm install
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login) and sign in with **any display name** (2–64 characters) plus the shared password from `DEMO_PASSWORD` in `.env.local` (default `inoyu-demo-local` if unset — change before sharing publicly).

| Route | Purpose |
|-------|---------|
| `/login` | **Demo gate** — required before any other route |
| `/demo` | **How it works** — product walkthrough (operators start here) |
| `/` or `/?utm_source=meta` | 4-step retirement quiz |
| `/dashboard` | Marketing dashboard — live profiles + AI brief (polls every 2s) |
| `/dashboard/visitors` | Visitor profiles, AI brief, journey timeline |
| `/dashboard/funnel` | Quiz funnel analytics |
| `/dashboard/experiments` | Quiz variant A/B |
| `/dashboard/demo-usage` | Demo tester sign-ins, pages visited, Unomi mirror |
| `/dashboard/tools` | AI usage, agent chat, SMS simulator |
| `/follow-up?profileId=…` | Channel-specific follow-up experience |
| `/sms?profileId=…` | Redirects to `/follow-up` |

**Production demo** (`retirement.inoyu.dev`): live **Apache Unomi** on Infomaniak managed Kubernetes + **Infomaniak AI Tools** + Vercel frontend. **Local dev** without env vars falls back to JSON mock + template AI. See [Implementation status](#implementation-status).

With `UNOMI_BASE_URL`, events mirror to remote Apache Unomi. With `INFOMANIAK_*` or `OPENAI_*`, AI features call a live LLM. Both can be mixed (e.g. AI live + CDP mock = **Hybrid live** mode on the dashboard badge). **Infomaniak AI** is the default provider (`INFOMANIAK_API_TOKEN` + `INFOMANIAK_AI_PRODUCT_ID`); other OpenAI-compatible APIs still work via `OPENAI_BASE_URL`.

---

## Testing

Full details: [`tests/integration/README.md`](tests/integration/README.md)

```bash
# Quick local verification (build + all suites)
npm run test:all:local

# Individual suites
npm run test:integration:local      # Unomi CDP (skips if UNOMI_BASE_URL unset)
npm run test:app:integration:local  # App API routes (:3099)
npm run test:e2e:install              # First-time Playwright browser install
npm run test:e2e                      # Browser E2E (:3100)

# AI integration — manual only, never in CI
RUN_AI_INTEGRATION_TESTS=1 npm run test:integration:ai:local

# Post-deploy smoke (live Vercel URL)
npm run test:smoke:prod
SMOKE_BASE_URL=https://your-preview.vercel.app npm run test:smoke:prod
```

| Suite | Tests | CI |
|-------|-------|-----|
| Unomi integration | 6 | Runs when `UNOMI_BASE_URL` secret set |
| App API integration | 20 | Always |
| Playwright E2E | 11 (×2 projects locally) | Chromium only |
| Production smoke | 13 checks | Manual / after `deploy:vercel` |
| AI integration | Manual | **Never** |

---

## Demo gate (tester login)

The whole app is behind a lightweight demo password gate (middleware redirects unauthenticated visitors to `/login`). This keeps a deployed demo private while still letting each tester identify themselves.

### Environment variables

| Variable | Default (dev only) | Purpose |
|----------|-------------------|---------|
| `DEMO_PASSWORD` | `inoyu-demo-local` | **Shared password** for all demo testers. Set a strong value in `.env.local` before deploying or sharing the URL. |
| `DEMO_AUTH_SECRET` | `inoyu-cdp-retirement-demo-dev-secret` | **Session signing secret** (HMAC). Must be a long random string in production so session cookies cannot be forged. |
| `DEMO_COOKIE_SECURE` | `true` in production | Set to `false` for local HTTP E2E tests only |

Generate a production secret:

```bash
openssl rand -hex 32
```

Example `.env.local` for a production demo:

```bash
DEMO_PASSWORD=your-shared-demo-password
DEMO_AUTH_SECRET=a1b2c3d4e5f6789…   # output of openssl rand -hex 32
```

### How testers sign in

1. Open `/login` (or any route — you will be redirected there).
2. **Your name** — any label, 2–64 characters (e.g. `Alex`, `Sales demo`, `Inoyu ops`). This is **not** a separate account password; it identifies who is testing.
3. **Password** — the single shared value from `DEMO_PASSWORD`.
4. Session cookie lasts **30 days**; sign out via the header bar when done.

There is no fixed user list in config: one shared password, many testers distinguished by the name they enter at login.

### What gets tracked (silent)

Each login creates a stable `demoUserId` derived from the username. Usage is recorded in `.data/demo-analytics.json` and mirrored to **Apache Unomi** when `UNOMI_BASE_URL` is set:

| Event source | Unomi `itemId` | Key events |
|--------------|----------------|------------|
| Demo gate & navigation | `demo_platform` | `demoLogin`, `demoLogout`, `demoPageView`, `demoPageDwell`, `demoSessionStart`, `demoQuizSessionLinked`, `demoQuizCompleted` |
| Quiz while signed in | `inoyu_cdp_retirement` | All quiz events include `demoTesterId` + `demoTesterUsername` |

**Demo usage** (`/dashboard/demo-usage`, linked from `/demo` — not in dashboard nav) lists every tester, pages visited, dwell time, and recent actions (polls every 5s). In Unomi, search profiles where `properties.profileKind = demo_tester` or events from source `demo_platform`.

Register demo event schemas once on your Unomi server: `npm run verify:unomi:schemas`.

To remove legacy context-only noise on the test CDP (dry-run by default): `npm run cleanup:unomi`. Apply deletes with `npm run cleanup:unomi:execute` (optionally add `--include-sparse` or `--limit=50` to the script).

### Public routes (no login)

Only `/login`, `/api/demo-auth/login`, static assets, and Next.js internals bypass the gate.

---

## Deploy to Vercel (production)

**Full runbook:** [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — phases, env vars, DNS, smoke tests, rollback.

| Item | Recommendation |
|------|----------------|
| **Primary URL** | `https://retirement.inoyu.dev` — visitor-first FinPub landing (quiz at `/`) |
| **Alt URLs** | `retire-ready.inoyu.dev`, `your-retirement.inoyu.dev` (same project, optional) |
| **Platform** | Vercel — `npm run deploy:vercel` or GitHub Action on push to `main` |
| **CLI setup** | `npx vercel login` → `npm run vercel:link` → `npm run vercel:env:sync` → `npm run deploy:vercel` |
| **Must configure** | `DEMO_PASSWORD`, `DEMO_AUTH_SECRET`, `UNOMI_*`, `INFOMANIAK_*` (or `OPENAI_*`) |
| **Pre-deploy** | `npm run test:all:local` then `npm run verify:integrations` |
| **Post-deploy** | `npm run test:smoke:prod` (runs automatically after `deploy:vercel`; skip with `--skip-smoke`) |

On Vercel, `.data/` JSON files are **ephemeral** — configure remote **Unomi** for any live demo where profiles must persist.

---

## Live demo (Infomaniak AI + remote Unomi)

The app runs offline with local JSON fallbacks. For a **real** demo against your deployed Unomi server and Infomaniak AI (or another LLM):

### 1. Configure environment

```bash
cp .env.example .env.local
```

Set at minimum:

| Variable | Example | Purpose |
|----------|---------|---------|
| `DEMO_PASSWORD` | `your-demo-secret` | Shared password for all demo testers at `/login` |
| `DEMO_AUTH_SECRET` | `(openssl rand -hex 32)` | Signs demo session cookies — change for every deploy |
| `UNOMI_BASE_URL` | `https://unomi.example.com:8181` | Remote Apache Unomi (no trailing slash) |
| `UNOMI_USERNAME` / `UNOMI_PASSWORD` | Karaf admin credentials | REST API + context ingestion |
| `UNOMI_SCOPE` | `inoyu-cdp-retirement` | Must match a scope configured on the server |
| `INFOMANIAK_API_TOKEN` | From Infomaniak Manager | Bearer token (scope: AI Tools) |
| `INFOMANIAK_AI_PRODUCT_ID` | From `GET /1/ai` | Builds `https://api.infomaniak.com/2/ai/{id}/openai/v1` automatically |
| `OPENAI_MODEL` | `qwen3` | Model id from Infomaniak (`llama3`, `mistral3`, …) |
| `OPENAI_COST_INPUT_PER_MTOK` | `0.15` | Optional USD per 1M input tokens (marketer cost estimate) |
| `OPENAI_COST_OUTPUT_PER_MTOK` | `0.60` | Optional USD per 1M output tokens (marketer cost estimate) |

**Other LLM providers:** set `OPENAI_API_KEY` + `OPENAI_BASE_URL` instead of the Infomaniak vars. See `.env.example`.

Optional for Unomi v3 / Inoyu: `UNOMI_VERSION=v3` and `UNOMI_TENANT_PUBLIC_TOKEN`.

**Logging:** API failures, Unomi sync errors, and LLM errors always log structured details to the server console (Vercel Functions logs). Set `LOG_LEVEL=debug` or `UNOMI_DEBUG=true` for verbose success traces.

### 2. Verify before the demo

```bash
npm run verify:integrations
```

This checks LLM API access and Unomi admin + context APIs. Fix any auth or scope errors before presenting.

### 3. What syncs to Unomi

| Source | Unomi `itemId` | Events |
|--------|----------------|--------|
| Quiz + dashboard | `inoyu_cdp_retirement` | `view`, `contentEngagement`, `quizCompleted`, `quizStepView`, `quizChatMessage`, … |
| Demo usage (silent) | `demo_platform` | `demoLogin`, `demoPageView`, `demoPageDwell`, `demoMouseActivity`, … |
| Dashboard agent | `inoyu_cdp_retirement` / marketer session | `dashboardAgentMessage` |

All events include `sessionId` for session continuity across serverless rehydration.

Local `.data/profiles.json` remains a cache so the UI stays fast if Unomi is briefly unavailable.

### 4. Dashboard integration status

Open `/dashboard` — badges at the top show **Live demo** when both the LLM and Unomi are connected, or **Local fallback** when running on templates / JSON store.

`GET /api/integrations/health` returns the full connectivity report (auth-gated like the rest of the demo).

### Unomi server checklist

1. Unomi reachable from your Next.js host (firewall / TLS).
2. Scope `UNOMI_SCOPE` created on the server.
3. Karaf user can call `/cxs/context.json` and `/cxs/profiles/*`.
4. For health probes: `/health/check` enabled (optional).

---

## Architecture

1. **Context** — `POST /api/context` creates or resumes a session profile (`sessionId` in body or cookie) and fires an initial `view` event (mirrored to Unomi when configured). Sets httpOnly visitor cookies on the response.
2. **Events** — `POST /api/events` tracks `contentEngagement`, quiz steps, or submits the quiz (`quizCompleted`). Accepts `sessionId` in body or visitor cookies.
3. **Profile** — `GET /api/profile` lists or fetches visitor profiles for the dashboard; single-profile reads accept `sessionId` for rehydration.
4. **Summary** — `GET /api/summary?profileId=` builds an agent brief from quiz + engagement signals (template or AI).
5. **Chat** — `POST /api/chat` in-quiz help and dashboard agent (`POST /api/dashboard-agent`).
6. **Messaging** — `POST /api/sms` starts a personalized thread and handles lead replies + conversion detection (SMS, WhatsApp, LINE demos).

### Visitor identity

- **Client:** `localStorage` keys (`inoyu_cdp_retirement_session_id`, `inoyu_cdp_retirement_profile_id`, `inoyu_cdp_retirement_unomi_profile_id`) via `persistVisitorContext()` after context init.
- **Server:** httpOnly cookies (`inoyu_cdp_retirement_visitor_session`, `inoyu_cdp_retirement_visitor_profile`, `inoyu_cdp_retirement_unomi_profile`) set on mutation responses.
- **Rehydration:** `GET /api/profile?profileId=` accepts optional `sessionId` query; mutations fall back to cookies when the body omits ids.
- **List endpoint:** `GET /api/profile` without `profileId` always lists all profiles (ignores cookies).

---

## Channel-of-choice opt-in

Visitors pick how to be recontacted at quiz Step 3:

- **Email** (default) — most preferred for brand comms in the US
- **Browser push** — gentle on-device alert
- **SMS / phone call** — common US financial follow-up
- **WhatsApp / LINE** — dominant in much of Asia
- **On-page only** — no outbound messages

Each choice sets Unomi-style segments (`prefers_email`, `prefers_whatsapp`, etc.) and routes the follow-up UI accordingly.

---

## CDP & paid media FAQ

This demo illustrates CDP patterns for financial publishing. The notes below map the retirement quiz scenario to typical paid-media workflows.

### 1. Why does a CDP matter for paid media in financial publishing?

Paid traffic is expensive and regulated. A CDP unifies **anonymous click behavior** (UTM, content dwell, quiz answers) with **known lead attributes** in one profile so media buyers can see intent before handoff — without rebuilding integrations per channel. This demo shows that loop: Meta/Taboola entry → engagement signals → scored segment → personalized follow-up.

### 2. How Apache Unomi fits this flow

Unomi receives the same events sent from `unomi-client.ts` via `POST …/cxs/context.json`: `view`, `contentEngagement`, `quizCompleted`, `smsStarted`, `smsReply`, and `conversion`. Segments and scores can be computed in Unomi rules; this app also derives segments locally (`pre_retiree_near_term`, `readiness_gap`, `prefers_email`, etc.).

**Production:** Apache Unomi runs on **Infomaniak managed Kubernetes** (`UNOMI_BASE_URL`). Local dev without that URL uses an identical JSON mock. Demo tester activity mirrors to Unomi via `demo_platform` events — see `/dashboard/demo-usage`.

### 3. What signals best predict conversion for pre-retirees?

**(a)** repeated Social Security or rollover content views, **(b)** quiz readiness score under ~65 with near-term retirement window, **(c)** primary concern matching content consumed, **(d)** explicit channel opt-in. The AI brief weights these into `signals[]` and a tailored opener.

### 4. AI follow-up compliance and brand safety

Fixed system prompts, structured profile + summary JSON (not open-ended scraping), template fallbacks when the API is unavailable, explicit consent copy per channel, and conversion detection via keyword rules. Every message logs on the profile timeline for QA.

### 5. ROI metrics for media buyers

Funnel metrics per `utm_source` and `contactChannel`: views → engagement → quiz completion → follow-up start → conversion type. Compare lead score distribution and cost per qualified conversation by source and channel.

---

## API reference (demo)

### Demo auth

- `POST /api/demo-auth/login` — `{ username, password }` — validates against `DEMO_PASSWORD`; sets signed session cookie
- `POST /api/demo-auth/logout` — clears session
- `GET /api/demo-auth/session` — current tester session (if any)
- `POST /api/demo-telemetry` — silent usage events (auth required)
- `GET /api/demo-analytics` — demo tester usage summary (auth required)

### Quiz & profiles

- `POST /api/context` — `{ sessionId, utm_source?, utm_campaign?, preferredLanguage? }`
- `POST /api/events` — `{ action: "track", profileId, sessionId, eventType, properties? }` or `{ action: "quiz", profileId, sessionId, answers }`
- `GET /api/profile?profileId=&sessionId=` or list all
- `GET /api/summary?profileId=&sessionId=&source=template|ai`
- `POST /api/chat` — in-quiz help chat
- `POST /api/dashboard-agent` — marketer agent with optional profile focus
- `POST /api/sms` — `{ action: "start"|"reply", profileId, sessionId, message? }`
- `GET /api/funnel` — funnel aggregate for dashboard

---

## License

[MIT License](LICENSE) — Copyright (c) 2026 Serge Huber.

Demo code for educational and demonstration purposes only — **not** personalized financial advice.
