# LeadLens — FinPub Retirement CDP Demo

**It's Today Media Build Challenge submission**

End-to-end demo: **Apache Unomi** event capture (Inoyu-compatible), **AI profile intelligence**, and **omnichannel follow-up** grounded in real visitor intent.

Built on patterns from [Inoyu.dev](https://inoyu.dev/) — open Apache Unomi core, privacy-first profiles, AI-ready context.

---

## What does this tool do?

Captures visitor behavior on a FinPub retirement quiz (Unomi events), builds a unified lead profile with segments and lead score, generates an **AI brief and personalized next steps** for visitors and media buyers, and routes each visitor to their **chosen follow-up channel** — email, SMS, WhatsApp, LINE, phone callback, browser push, or on-page results only.

## Why did I build THIS one?

ITM's money is made between the **ad click and the monetized conversation**. They build landing pages and Trackly SMS — the missing layer is **knowing why someone showed up** before outreach. This closes that loop: paid traffic → engagement signals → scored segment → channel-of-choice follow-up.

## What would I build next full-time?

Connect MCP ad workflows (Meta, Taboola, Google) to Unomi, auto-generate LP variants per segment, sync leads into Trackly / WhatsApp Business / LINE journeys, and report cost-per-qualified-conversation by `utm_source` and `contactChannel`.

---

## Two product surfaces

| Surface | Route | Who |
|---------|-------|-----|
| **Visitor quiz** | `/` | Pre-retiree — plain language, 4 steps, channel of choice |
| **Marketing dashboard** | `/dashboard` | Media buyer — live profiles, segments, AI brief, timeline |

Contest walkthrough and judge instructions live only on **`/demo` (How it works)** — not on the visitor or dashboard UX.

---

## Quick start

```bash
cp .env.example .env.local   # demo gate, Unomi, Infomaniak AI — see below
npm install
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login) and sign in with **any display name** (2–64 characters) plus the shared password from `DEMO_PASSWORD` in `.env.local` (default `itsmedia` if unset — change before sharing publicly).

| Route | Purpose |
|-------|---------|
| `/login` | **Demo gate** — required before any other route |
| `/demo` | **How it works** — contest walkthrough (judges start here) |
| `/` or `/?utm_source=meta` | 4-step retirement quiz |
| `/dashboard` | Marketing dashboard — live profiles + AI brief (polls every 2s) |
| `/follow-up?profileId=…` | Channel-specific follow-up experience |
| `/sms?profileId=…` | Redirects to `/follow-up` |

**Contest demo mode:** without a remote Unomi host, the app uses a local Unomi-compatible CDP mock (`.data/profiles.json`) — same events, profiles, and dashboard UX. Remote Unomi deployment was deferred due to time constraints; see `/demo#unomi-mock` and `docs/DEPLOYMENT.md`.

Without `UNOMI_BASE_URL`, profiles persist in `.data/profiles.json`. Without an LLM API token, AI features use deterministic templates. **Infomaniak AI** is the default provider (`INFOMANIAK_API_TOKEN` + `INFOMANIAK_AI_PRODUCT_ID`); other OpenAI-compatible APIs still work via `OPENAI_BASE_URL`.

---

## Demo gate (tester login)

The whole app is behind a lightweight demo password gate (middleware redirects unauthenticated visitors to `/login`). This keeps a deployed showcase private while still letting each tester identify themselves.

### Environment variables

| Variable | Default (dev only) | Purpose |
|----------|-------------------|---------|
| `DEMO_PASSWORD` | `itsmedia` | **Shared password** for all demo testers. Set a strong value in `.env.local` before deploying or sharing the URL. |
| `DEMO_AUTH_SECRET` | `itstoday-demo-dev-secret` | **Session signing secret** (HMAC). Must be a long random string in production so session cookies cannot be forged. |

Generate a production secret:

```bash
openssl rand -hex 32
```

Example `.env.local` for a judge showcase:

```bash
DEMO_PASSWORD=your-shared-showcase-password
DEMO_AUTH_SECRET=a1b2c3d4e5f6789…   # output of openssl rand -hex 32
```

### How testers sign in

1. Open `/login` (or any route — you will be redirected there).
2. **Your name** — any label, 2–64 characters (e.g. `Alex`, `Judge 2`, `ITM marketing`). This is **not** a separate account password; it identifies who is testing.
3. **Password** — the single shared value from `DEMO_PASSWORD`.
4. Session cookie lasts **30 days**; sign out via the header bar when done.

There is no fixed user list in config: one shared password, many testers distinguished by the name they enter at login.

### What gets tracked (silent)

Each login creates a stable `demoUserId` derived from the username. Usage is recorded in `.data/demo-analytics.json` and, when Unomi is configured, as `demo_platform` events (`demoLogin`, `demoPageView`, `demoPageDwell`, etc.). This telemetry is **not** shown on the visitor quiz — it is for operators reviewing demo engagement.

### Public routes (no login)

Only `/login`, `/api/demo-auth/login`, static assets, and Next.js internals bypass the gate.

---

## Deploy to Vercel (production)

**Full runbook:** [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — phases, env vars, DNS, smoke tests, rollback.

| Item | Recommendation |
|------|----------------|
| **Primary URL** | `https://retirement.inoyu.dev` — visitor-first FinPub landing (quiz at `/`) |
| **Alt URLs** | `retire-ready.inoyu.dev`, `your-retirement.inoyu.dev` (same project, optional) |
| **Platform** | Vercel — import Git repo, set env vars, CNAME `retirement` → `cname.vercel-dns.com` |
| **Must configure** | `DEMO_PASSWORD`, `DEMO_AUTH_SECRET`, `UNOMI_*`, `INFOMANIAK_*` (or `OPENAI_*`) |

On Vercel, `.data/` JSON files are **ephemeral** — configure remote **Unomi** for any live demo where profiles must persist. Run `npm run verify:integrations` locally with production env before go-live.

---

## Live showcase (Infomaniak AI + remote Unomi)

The app runs offline with local JSON fallbacks. For a **real** demo against your deployed Unomi server and Infomaniak AI (or another LLM):

### 1. Configure environment

```bash
cp .env.example .env.local
```

Set at minimum:

| Variable | Example | Purpose |
|----------|---------|---------|
| `DEMO_PASSWORD` | `your-showcase-secret` | Shared password for all demo testers at `/login` |
| `DEMO_AUTH_SECRET` | `(openssl rand -hex 32)` | Signs demo session cookies — change for every deploy |
| `UNOMI_BASE_URL` | `https://unomi.example.com:8181` | Remote Apache Unomi (no trailing slash) |
| `UNOMI_USERNAME` / `UNOMI_PASSWORD` | Karaf admin credentials | REST API + context ingestion |
| `UNOMI_SCOPE` | `itstoday` | Must match a scope configured on the server |
| `INFOMANIAK_API_TOKEN` | From Infomaniak Manager | Bearer token (scope: AI Tools) |
| `INFOMANIAK_AI_PRODUCT_ID` | From `GET /1/ai` | Builds `https://api.infomaniak.com/2/ai/{id}/openai/v1` automatically |
| `OPENAI_MODEL` | `qwen3` | Model id from Infomaniak (`llama3`, `mistral3`, …) |
| `OPENAI_COST_INPUT_PER_MTOK` | `0.15` | Optional USD per 1M input tokens (marketer cost estimate) |
| `OPENAI_COST_OUTPUT_PER_MTOK` | `0.60` | Optional USD per 1M output tokens (marketer cost estimate) |

**Other LLM providers:** set `OPENAI_API_KEY` + `OPENAI_BASE_URL` instead of the Infomaniak vars. See `.env.example`.

Optional for Unomi v3 / Inoyu: `UNOMI_VERSION=v3` and `UNOMI_TENANT_PUBLIC_TOKEN`.

### 2. Verify before the demo

```bash
npm run verify:integrations
```

This checks LLM API access and Unomi admin + context APIs. Fix any auth or scope errors before presenting.

### 3. What syncs to Unomi

| Source | Unomi `itemId` | Events |
|--------|----------------|--------|
| Quiz + dashboard | `retirement_quiz` | `view`, `contentEngagement`, `quizCompleted`, `quizStepView`, … |
| Demo usage (silent) | `demo_platform` | `demoLogin`, `demoPageView`, `demoPageDwell`, `demoMouseActivity`, … |

Local `.data/profiles.json` remains a cache so the UI stays fast if Unomi is briefly unavailable.

### 4. Dashboard integration status

Open `/dashboard` — badges at the top show **Live showcase** when both the LLM and Unomi are connected, or **Local fallback** when running on templates / JSON store.

`GET /api/integrations/health` returns the full connectivity report (auth-gated like the rest of the demo).

### Unomi server checklist

1. Unomi reachable from your Next.js host (firewall / TLS).
2. Scope `UNOMI_SCOPE` created on the server.
3. Karaf user can call `/cxs/context.json` and `/cxs/profiles/*`.
4. For health probes: `/health/check` enabled (optional).

## Architecture

1. **Context** — `POST /api/context` creates or resumes a session profile and fires an initial `view` event (mirrored to Unomi when configured).
2. **Events** — `POST /api/events` tracks `contentEngagement` (Social Security / 401k sections) or submits the quiz (`quizCompleted`).
3. **Profile** — `GET /api/profile` lists or fetches visitor profiles for the dashboard.
4. **Summary** — `GET /api/summary?profileId=` builds an agent brief from quiz + engagement signals.
5. **Messaging** — `POST /api/sms` starts a personalized thread and handles lead replies + conversion detection (used for SMS, WhatsApp, and LINE demos).

## Channel-of-choice opt-in

Visitors pick how to be recontacted at quiz Step 3:

- **Email** (default) — most preferred for brand comms in the US
- **Browser push** — gentle on-device alert
- **SMS / phone call** — common US financial follow-up
- **WhatsApp / LINE** — dominant in much of Asia
- **On-page only** — no outbound messages

Each choice sets Unomi-style segments (`prefers_email`, `prefers_whatsapp`, etc.) and routes the follow-up UI accordingly.

## Contest answers

### 1. Why does a CDP matter for paid media in financial publishing?

Paid traffic is expensive and regulated. A CDP unifies **anonymous click behavior** (UTM, content dwell, quiz answers) with **known lead attributes** in one profile so media buyers can see intent before handoff — without rebuilding integrations per channel. This demo shows that loop: Meta/Taboola entry → engagement signals → scored segment → personalized follow-up.

### 2. How would you use Apache Unomi in this flow?

Unomi receives the same events sent from `unomi-client.ts` via `POST …/cxs/context.json`: `view`, `contentEngagement`, `quizCompleted`, `smsStarted`, `smsReply`, and `conversion`. Segments and scores can be computed in Unomi rules; this app also derives segments locally (`pre_retiree_near_term`, `readiness_gap`, `prefers_email`, etc.).

**This submission:** remote Unomi was not deployed before the deadline, so judges see a **local Unomi-compatible mock** with identical event semantics and dashboard agent tools. Connecting a remote instance is a configuration-only step — see `docs/DEPLOYMENT.md`.

### 3. What signals best predict conversion for pre-retirees?

**(a)** repeated Social Security or rollover content views, **(b)** quiz readiness score under ~65 with near-term retirement window, **(c)** primary concern matching content consumed, **(d)** explicit channel opt-in. The AI brief weights these into `signals[]` and a tailored opener.

### 4. How do you keep AI follow-up compliant and on-brand?

Fixed system prompts, structured profile + summary JSON (not open-ended scraping), template fallbacks when the API is unavailable, explicit consent copy per channel, and conversion detection via keyword rules. Every message logs on the profile timeline for QA.

### 5. What would you measure to prove ROI to a media buyer?

Funnel metrics per `utm_source` and `contactChannel`: views → engagement → quiz completion → follow-up start → conversion type. Compare lead score distribution and cost per qualified conversation by source and channel.

## API reference (demo)

### Demo auth

- `POST /api/demo-auth/login` — `{ username, password }` — validates against `DEMO_PASSWORD`; sets signed session cookie
- `POST /api/demo-auth/logout` — clears session
- `GET /api/demo-auth/session` — current tester session (if any)
- `POST /api/demo-telemetry` — silent usage events (auth required)

### Quiz & profiles

- `POST /api/context` — `{ sessionId, utm_source?, utm_campaign? }`
- `POST /api/events` — `{ action: "track", profileId, eventType, properties? }` or `{ action: "quiz", profileId, answers }`
- `GET /api/profile?profileId=` or list all
- `GET /api/summary?profileId=`
- `POST /api/sms` — `{ action: "start"|"reply", profileId, message? }`

## License

Contest submission — demo code only, not production financial advice.
