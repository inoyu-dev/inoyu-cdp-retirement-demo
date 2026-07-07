# Deployment guide — Vercel + Inoyu.dev

Deploy the **Inoyu CDP Retirement Demo** frontend to Vercel with a custom subdomain on `inoyu.dev`, connected to remote Apache Unomi and Infomaniak AI (or another OpenAI-compatible LLM).

---

## Recommended URL

The public URL should speak to **pre-retiree visitors** (ad clicks, quiz landing), not internal tooling names. Use an `inoyu.dev` subdomain — no new domain purchase required.

| Priority | Subdomain | Why |
|----------|-----------|-----|
| **Primary** | [`retirement.inoyu.dev`](https://retirement.inoyu.dev) | Plain, trustworthy, visitor-first — reads like a FinPub landing page |
| Alt (warm) | `retire-ready.inoyu.dev` | Slightly more motivational; same audience |
| Alt (specific) | `your-retirement.inoyu.dev` | Conversational; good for email/SMS deep links |

**Deploy production on `retirement.inoyu.dev`.** Operators and media buyers use the same URL; they sign in at `/login`, then open `/dashboard` or `/demo` as needed. Avoid internal codenames in the public URL — use the production hostname only.

---

## Architecture on Vercel

```
                    ┌─────────────────────────────────────┐
  Visitors / ads    │  retirement.inoyu.dev (Vercel Edge)   │
  ───────────────►  │  Next.js 16 · middleware demo gate  │
                    └──────────┬──────────────┬───────────┘
                               │              │
                    x-vercel-ip-country        HTTPS
                               │              │
                               ▼              ▼
                    Region-aware quiz    Remote Apache Unomi
                    channel UI           (Infomaniak managed K8s)
                               │
                               ▼
                    Infomaniak AI Tools (stateless — no prompt retention)
```

### Critical: serverless filesystem

Vercel **does not persist** writes to `.data/` across requests or redeploys. On Vercel you **must** treat **Apache Unomi** as the system of record for profiles and events.

| Store | Local dev | Vercel production |
|-------|-----------|-------------------|
| `.data/profiles.json` | Works | Ephemeral — do not rely on it |
| `.data/demo-analytics.json` | Works | Ephemeral — prefer Unomi `demo_platform` events |
| `.data/ai-usage.json` | Works | Resets on cold starts / redeploys — OK for rough demo estimates |
| `.data/quiz-experiment.json` | Works | Ephemeral — A/B variant state may reset |

**Minimum for a live demo on Vercel:** configure `UNOMI_BASE_URL` (+ credentials) **and** `INFOMANIAK_API_TOKEN` + `INFOMANIAK_AI_PRODUCT_ID` (or `OPENAI_API_KEY`).

---

## Deployment phases

### Phase 0 — Prerequisites (1–2 days before)

- [ ] Git repository [`inoyu-dev/inoyu-cdp-retirement-demo`](https://github.com/inoyu-dev/inoyu-cdp-retirement-demo) on GitHub (connected to Vercel)
- [ ] Vercel team/project access (Inoyu org)
- [ ] DNS access for `inoyu.dev` (add CNAME)
- [ ] Remote Unomi reachable over **HTTPS** from the public internet
- [ ] Unomi scope `UNOMI_SCOPE` created; Karaf user can call `/cxs/context.json`
- [ ] Visitor httpOnly cookies set on `/api/context` and mutation routes (check browser devtools)
- [ ] Infomaniak AI Tools token + product id (or other OpenAI-compatible API key)
- [ ] Production secrets generated locally:

```bash
openssl rand -hex 32   # → DEMO_AUTH_SECRET
openssl rand -base64 24 | tr -d '/+=' | head -c 20   # → DEMO_PASSWORD (example)
```

### Phase 1 — Staging preview (optional)

- [ ] Connect repo to Vercel → first **Preview** deployment
- [ ] Set Preview env vars (can use weaker demo password)
- [ ] Run `npm run verify:integrations` locally against same Unomi URL
- [ ] Walk `/demo` → quiz → `/dashboard`; open `/dashboard/demo-usage` via direct URL (hidden from nav)

### Phase 2 — Production deploy

- [ ] Add **Production** environment variables (see table below)
- [ ] Assign custom domain `retirement.inoyu.dev`
- [ ] Enable “Automatically expose System Environment Variables” (for `x-vercel-ip-country`)
- [ ] Production deploy from `main` branch
- [ ] Smoke test checklist (end of this doc)

### Phase 3 — Demo handoff

- [ ] Share visitor URL `https://retirement.inoyu.dev` in ads / walkthroughs
- [ ] Share `DEMO_PASSWORD` privately with demo visitors and testers
- [ ] Monitor Vercel deployment logs + Unomi during live demo

---

## Automated deploy (Vercel CLI)

This repo includes npm scripts and a GitHub Action for repeatable deploys.

### One-time local setup

```bash
npm install
npx vercel login             # OAuth device flow — approve in browser (do not use email login)
npm run vercel:link          # links to inoyu-dev/inoyu-cdp-retirement-demo (or create new)
npm run vercel:env:sync      # pushes .env.local → Vercel production + preview
```

**Login error (410 legacy flow)?** Upgrade the project CLI: `npm install` (uses `vercel@^54`), then run `npx vercel login` again. Email-based login is no longer supported.

Rotate `DEMO_PASSWORD` and `DEMO_AUTH_SECRET` in `.env.local` **before** syncing.

**Why does `vercel env pull` show empty values?** Sensitive Production variables are not exported into local files — you will see `NAME=""`. That is expected. Use the Vercel dashboard (**Reveal**) or `npm run vercel:env:verify` to confirm lengths. After syncing, run `npm run deploy:vercel` so Production deployments pick up new values.



### Deploy from your machine

```bash
npm run verify:integrations  # optional — runs automatically unless --skip-verify
npm run deploy:vercel          # production (--prod); runs test:smoke:prod after deploy
npm run deploy:vercel:preview  # preview URL only
npm run test:smoke:prod        # post-deploy smoke against retirement.inoyu.dev
```

### CI deploy on push to `main`

Workflow: `.github/workflows/vercel-production.yml`

Add these **GitHub repository secrets** (Settings → Secrets → Actions):

| Secret | Where to get it |
|--------|------------------|
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Vercel project → Settings → General, or `vercel project ls` |
| `VERCEL_PROJECT_ID` | Same as above |

After secrets are set, every push to `main` builds and deploys production. You can also run the workflow manually (**Actions → Vercel Production → Run workflow**).

Environment variables for CI builds are pulled from Vercel (`vercel pull`) — keep them in the Vercel dashboard or sync with `npm run vercel:env:sync`.


---

## Step-by-step: Vercel project

### 1. Import repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import [`inoyu-dev/inoyu-cdp-retirement-demo`](https://github.com/inoyu-dev/inoyu-cdp-retirement-demo) (or your fork)
3. Framework preset: **Next.js** (auto-detected)
4. Root directory: `./`
5. Build command: `npm run build` (default)
6. Output: Next.js default — no custom `vercel.json` required

### 2. Environment variables

Add these in **Project → Settings → Environment Variables** for **Production** (and Preview if testing):

| Variable | Production | Notes |
|----------|------------|-------|
| `DEMO_PASSWORD` | ✅ Required | Strong shared password for `/login` |
| `DEMO_AUTH_SECRET` | ✅ Required | Output of `openssl rand -hex 32` |
| `UNOMI_BASE_URL` | ✅ Required | e.g. `https://test-cdp.inoyu.dev` — no trailing slash |
| `UNOMI_USERNAME` | ✅ Required | Karaf admin |
| `UNOMI_PASSWORD` | ✅ Required | Karaf admin |
| `UNOMI_SCOPE` | ✅ Required | e.g. `inoyu-cdp-retirement` |
| `UNOMI_CONTEXT_USE_ADMIN_AUTH` | ✅ | `true` for remote v2 |
| `INFOMANIAK_API_TOKEN` | ✅ Required* | Infomaniak Manager → API token (AI Tools scope) |
| `INFOMANIAK_AI_PRODUCT_ID` | ✅ Required* | From `GET https://api.infomaniak.com/1/ai` |
| `OPENAI_MODEL` | Optional | Default `qwen3` when Infomaniak is configured |
| `OPENAI_API_KEY` | Alt to Infomaniak | OpenRouter, Groq, OpenAI, etc. |
| `OPENAI_BASE_URL` | Alt to Infomaniak | Only if not using `INFOMANIAK_AI_PRODUCT_ID` |
| | | *Use Infomaniak vars **or** `OPENAI_API_KEY` + optional `OPENAI_BASE_URL` |
| `OPENAI_COST_INPUT_PER_MTOK` | Optional | Marketer cost panel |
| `OPENAI_COST_OUTPUT_PER_MTOK` | Optional | Marketer cost panel |
| `UNOMI_VERSION` | Optional | `v2` or `v3` |
| `UNOMI_TENANT_PUBLIC_TOKEN` | v3 only | Inoyu multi-tenant |
| `LOG_LEVEL` | Optional | `debug` for verbose server traces |
| `UNOMI_DEBUG` | Optional | `true` during first deploy (also enables debug logs) |

**Do not** commit `.env.local`. Copy from `.env.example` as a checklist.

### 3. Custom domain (`retirement.inoyu.dev`)

**In Vercel**

1. Project → **Settings → Domains**
2. Add `retirement.inoyu.dev`
3. Vercel shows required DNS record

**In DNS (inoyu.dev registrar / Cloudflare / etc.)**

| Type | Name | Value |
|------|------|-------|
| `CNAME` | `retirement` | `cname.vercel-dns.com` |

Or use Vercel nameservers on a subdomain if you prefer full Vercel DNS control.

4. Wait for SSL provisioning (usually &lt; 15 min)
5. Set **Production** domain as primary; redirect `*.vercel.app` to custom domain if desired

**Optional second domain:** repeat for `retire-ready.inoyu.dev` or `your-retirement.inoyu.dev` → same Vercel project (redirect to primary if you prefer one canonical URL).

### 4. Deploy

```bash
# CLI alternative (after npm i -g vercel && vercel login)
vercel --prod
```

Or push to `main` with Git integration for automatic production deploys.

### 5. Pre-flight verification

Run locally with **the same** env values you set on Vercel:

```bash
cp .env.example .env.local
# fill in production values
npm run verify:integrations
npm run build
```

Then on the live URL (after logging in):

**Automated:** `npm run test:smoke:prod` — login, auth gate, integration health, and key pages on `https://retirement.inoyu.dev`. Use `SMOKE_BASE_URL` for a preview deployment. Production deploy runs this automatically unless you pass `--skip-smoke` to `deploy:vercel`.

**Manual checklist:**

| Check | URL / action | Expected |
|-------|----------------|----------|
| Demo gate | `/` without cookie | Redirect to `/login` |
| Login | `/login` + name + password | Lands on quiz |
| Visitor entry | `/?utm_source=meta` | Quiz loads — URL reads naturally in ad mockups |
| Integrations | `/dashboard` badges | **Live demo** if Unomi + LLM OK |
| Health API | `GET /api/integrations/health` | `openai.ok` and `unomi.ok` true |
| Region | Quiz step 3 | Channels match your country (Vercel IP header) |
| Unomi events | Complete quiz | Events visible in Unomi admin |
| AI | Select profile on dashboard | AI summary (not template-only) |

---

## Unomi server checklist (remote)

1. **TLS** — Vercel serverless requires HTTPS to your Unomi host (valid cert).
2. **Firewall** — allow inbound from Vercel egress (or `0.0.0.0/0` on Unomi API port for demo).
3. **Scope** — `UNOMI_SCOPE` exists on server.
4. **Auth** — credentials in Vercel match Karaf user with context + REST access.
5. **CORS** — not required for server-side Next.js API routes (browser never calls Unomi directly).

If context ingestion fails, inspect Vercel **Functions** logs — Unomi and API errors always include scope, status, session/profile ids (truncated), and stack traces. Set `LOG_LEVEL=debug` for verbose success traces.

---

## Node.js version

Vercel defaults to a current Node LTS. To pin explicitly, add to `package.json`:

```json
"engines": { "node": ">=20" }
```

---

## Rollback

1. Vercel → **Deployments** → select last green deployment → **Promote to Production**
2. Or revert Git commit on `main` and redeploy

Keep previous `DEMO_PASSWORD` unchanged during rollback unless you rotated it.

---

## Security notes for public demo

- Rotate `DEMO_PASSWORD` if the URL stays public
- Never commit API keys or Karaf passwords
- `DEMO_AUTH_SECRET` must differ from dev default
- Session cookies are `httpOnly` + `secure` in production (`NODE_ENV=production`)

---

## Operator handout (template)

The **visitor-facing** link is the root URL. Share login credentials separately — never in public README.

Copy into email or Slack:

```
Your Retirement Guide — live demo
Visitor URL:  https://retirement.inoyu.dev/?utm_source=meta
Login:        https://retirement.inoyu.dev/login
Password:     [shared DEMO_PASSWORD — ask operator]

Suggested walkthrough:
1. Sign in with your name + shared password
2. Visitor tab: quiz from Meta ad (?utm_source=meta)
3. Operator tab: /dashboard (marketing view)
4. Optional: /demo for product walkthrough
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| Dashboard empty after quiz | Unomi not configured; ephemeral `.data` | Set `UNOMI_*` env vars |
| “Local fallback” badge | LLM or Unomi health check failed | Run `verify:integrations`; check Vercel env |
| Login loop | `DEMO_AUTH_SECRET` changed mid-session | Clear cookies; redeploy with stable secret |
| Wrong region channels | Missing IP header | Deploy on Vercel (not static export); check edge headers |
| AI always templates | Missing/invalid LLM token or product id | Fix `INFOMANIAK_*` or `OPENAI_*` |

---

## Related docs

- [README](../README.md) — product overview, demo gate, env reference
- [.env.example](../.env.example) — full variable list
