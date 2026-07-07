import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Brain,
  ExternalLink,
  ListOrdered,
  MessageCircle,
  Shield,
  Smartphone,
  Sparkles,
  UserCheck,
} from "lucide-react";
import DemoFlowGuide from "@/components/DemoFlowGuide";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HowItWorksPage() {
  return (
    <div className="mesh-hero min-h-[calc(100vh-8rem)]">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:space-y-8 sm:px-6 sm:py-10 lg:py-14">
        <header className="space-y-4 text-center">
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            <ListOrdered className="mr-1.5 size-3.5" aria-hidden />
            Product walkthrough
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">How it works</h1>
          <p className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Two product surfaces: the <strong className="font-medium text-foreground">visitor quiz</strong>{" "}
            (pre-retiree UX) and the <strong className="font-medium text-foreground">marketing dashboard</strong>{" "}
            (media buyer UX). Apache Unomi is live in production; outbound channels remain preview-only. Optimized for
            desktop and mobile. Operator and visitor demo instructions live here only.
          </p>
        </header>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Smartphone className="size-4 text-primary" aria-hidden />
              Mobile-friendly
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            Site header and dashboard nav use a burger menu on small screens. The visitor quiz, profile detail views,
            charts, and follow-up channels stack cleanly on phones.
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Visitor experience</CardTitle>
              <CardDescription>Target customer: age 50s-60s, plain language, channel of choice.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              <p>
                4-step quiz, score reveal, then personalized follow-up (email, SMS, WhatsApp, LINE, call-back,
                browser push, or on-page). Five languages on Step 1.
              </p>
              <p>
                <strong className="font-medium text-foreground">On-demand AI</strong>: Step 4 results, dashboard brief, and SMS use generate buttons. In-quiz AI chat replies on each send in AI mode. “Did you know?” tips are static.
              </p>
              <p>Optional AI or human help chat on every step; all messages become CDP events.</p>
            </CardContent>
          </Card>
          <Card className="border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Marketing experience</CardTitle>
              <CardDescription>Media buyer: live profiles, rich visuals, on-demand AI brief.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              <p>
                Dashboard nav: Overview, Visitors, Funnel, Experiments, and AI &amp; tools (polls every
                2s.
              </p>
              <p>
                <strong className="font-medium text-foreground">Visitors</strong>: hero banner, attribute cards,
                engagement charts, categorized journey timeline. Tap Generate brief with AI when needed.
              </p>
              <p>
                <strong className="font-medium text-foreground">Demo usage</strong>: who signed in, pages visited,
                dwell time, and recent actions — mirrored to Unomi under source{" "}
                <code className="text-xs">demo_platform</code>.
              </p>
              <p>
                <strong className="font-medium text-foreground">AI &amp; tools</strong>: Unomi agent chat + SMS
                simulator; every chat message mirrors to Unomi.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card id="stack" className="border-sky-500/25 bg-sky-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="size-5 text-primary" aria-hidden />
              Technical stack &amp; privacy
            </CardTitle>
            <CardDescription>
              A privacy-first, EU-friendly architecture for regulated financial publishing demos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                <p className="font-medium text-foreground">Frontend · Vercel</p>
                <p className="mt-1">
                  Next.js app and API routes on Vercel — global edge CDN, HTTPS, demo gate middleware, and serverless
                  handlers. No persistent visitor data on the frontend host; profiles live in your CDP.
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                <p className="font-medium text-foreground">CDP · Apache Unomi</p>
                <p className="mt-1">
                  Production Unomi runs on <strong className="font-medium text-foreground">Infomaniak managed Kubernetes</strong>{" "}
                  — you own scopes, segments, and event schemas. First-party profiles stay under your control, not inside
                  ad platforms.
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                <p className="font-medium text-foreground">AI · Infomaniak AI Tools</p>
                <p className="mt-1">
                  OpenAI-compatible API hosted in Switzerland/EU. Infomaniak AI Tools{" "}
                  <strong className="font-medium text-foreground">does not retain prompts or model outputs</strong> for
                  training — inference is stateless; only what you choose to store in Unomi becomes part of the profile.
                </p>
              </div>
            </div>
            <p>
              <strong className="font-medium text-foreground">Why this matters for FinPub:</strong> paid media traffic
              gets a consent-aware quiz and channel opt-in; behavioral signals land in{" "}
              <em>your</em> CDP; AI runs on generate taps (brief, results) or each AI chat send; step coach tips are static. Template fallbacks keep
              the UX working without an LLM. Every message and event can be audited on the profile timeline in Unomi.
            </p>
            <ul className="list-inside list-disc space-y-1 pl-1">
              <li>EU/Swiss hosting options across Vercel edge, Infomaniak K8s, and Infomaniak AI</li>
              <li>First-party data collection — no third-party ad pixel required for the core demo loop</li>
              <li>On-demand AI — no automatic LLM calls; results cached on the profile you control</li>
              <li>Explicit follow-up consent per channel (email, SMS, WhatsApp, LINE, push, on-page)</li>
              <li>Structured prompts + JSON context — not open-ended scraping of visitor pages</li>
            </ul>
          </CardContent>
        </Card>

        <Card id="unomi" className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="text-lg">Apache Unomi CDP (live)</CardTitle>
            <CardDescription>
              Production points at remote Apache Unomi — profiles and events persist across sessions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Events post to <code className="text-xs">POST /cxs/context.json</code> on your configured{" "}
              <code className="text-xs">UNOMI_BASE_URL</code> with scope{" "}
              <code className="text-xs">inoyu-cdp-retirement</code>. The dashboard integration badge shows{" "}
              <strong className="font-medium text-foreground">Live demo</strong> when both Unomi and the LLM are
              connected.
            </p>
            <p>
              Every event carries a <strong className="font-medium text-foreground">sessionId</strong> so profiles
              rehydrate correctly on Vercel serverless.
            </p>
            <p>
              <strong className="font-medium text-foreground">Two event sources:</strong>{" "}
              <code className="text-xs">inoyu_cdp_retirement</code> for visitor quiz, chat, SMS, and funnel activity;{" "}
              <code className="text-xs">demo_platform</code> for demo sign-ins, page views, dwell time, and tester
              navigation.
            </p>
            <p>
              Quiz events from signed-in testers also include <code className="text-xs">demoTesterId</code> so you can
              tie prospect activity back to their login name in Unomi.
            </p>
            <p>
              Visitor event types include view, contentEngagement, quizStepView, quizStepEngagement, quizCompleted,
              quizChatMessage, smsChatMessage, dashboardAgentMessage, and conversion. Demo usage adds demoLogin,
              demoPageView, demoPageDwell, demoQuizSessionLinked, and demoQuizCompleted.
            </p>
            <p className="text-xs">
              Offline dev only: if <code className="text-xs">UNOMI_BASE_URL</code> is unset, a local JSON store keeps
              the UX demoable — not used in the deployed demo.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCheck className="size-5 text-primary" aria-hidden />
              Demo usage tracking
            </CardTitle>
            <CardDescription>
              Silent telemetry for every person who signs into the demo — for you and future customer demos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              At <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">/login</Link>
              , each tester enters a display name plus the shared password. That creates a stable{" "}
              <code className="text-xs">demoUserId</code> and starts tracking logins, page views, dwell time, scroll
              depth, and mouse activity.
            </p>
            <p>
              Open <Link href="/dashboard/demo-usage" className="font-medium text-foreground underline-offset-4 hover:underline">Dashboard → Demo usage</Link>{" "}
              to see who came, when, and what they opened. The same data is mirrored to Unomi as{" "}
              <code className="text-xs">demo_platform</code> events — search profiles where{" "}
              <code className="text-xs">properties.profileKind = demo_tester</code>.
            </p>
            <p>
              Register event schemas once on your Unomi server:{" "}
              <code className="text-xs">npm run verify:unomi:schemas</code>.
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/25 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-lg">Still simulated (by design)</CardTitle>
            <CardDescription>Unomi and AI are live; outbound delivery is preview-only.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed text-muted-foreground">
            <ul className="list-inside list-disc space-y-1 pl-1">
              <li>Email, SMS, WhatsApp, LINE, and phone follow-up — in-app previews; events still log to Unomi</li>
              <li>Marketer SMS simulator on the dashboard — replays scenarios for buyers</li>
              <li>Ad platform sync — UTM capture only (no Meta/Taboola/Google APIs yet)</li>
              <li>LLM token costs — estimates from configured rates, not billing APIs</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="size-5 text-primary" aria-hidden />
              On-demand AI + caching
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              LLM calls happen only when a user explicitly requests AI. Results are cached on the visitor profile
              (aiArtifacts) so repeat views do not burn tokens.
            </p>
            <p>
              Production uses <strong className="font-medium text-foreground">Infomaniak AI Tools</strong> — EU-hosted,
              OpenAI-compatible, and stateless (no retention of prompts or outputs). Template fallbacks apply when no API
              token is configured.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="size-5 text-primary" aria-hidden />
              Chat to Unomi events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed text-muted-foreground">
            <ul className="list-inside list-disc space-y-1 pl-1">
              <li>In-quiz AI / human help chat (quizChatMessage)</li>
              <li>SMS follow-up simulator (smsChatMessage)</li>
              <li>Dashboard Unomi agent (dashboardAgentMessage)</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-lg">Region-aware channels (IP detection)</CardTitle>
            <CardDescription>On quiz Step 3, region is inferred from IP when deployed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">United States</span>: email, browser push, SMS, phone
              callback, or on-page.
            </p>
            <p>
              <span className="font-medium text-foreground">Asia-Pacific</span>: email, browser push, WhatsApp, LINE,
              or on-page.
            </p>
            <p>
              <span className="font-medium text-foreground">Other regions</span>: email, browser push, WhatsApp, or
              on-page.
            </p>
            <p>The visitor can override the detected region in Step 3; the dashboard records both.</p>
          </CardContent>
        </Card>

        <DemoFlowGuide />

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-lg">Demo access (login gate)</CardTitle>
            <CardDescription>The site requires sign-in before the quiz or dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Password</span>: shared demo password (
              <code className="text-xs">DEMO_PASSWORD</code> in env).
            </p>
            <p>
              <span className="font-medium text-foreground">Your name</span>: any display name at{" "}
              <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
                /login
              </Link>{" "}
              — used to identify you in Demo usage and Unomi (<code className="text-xs">demoUsername</code>).
            </p>
            <p>
              Usage is tracked silently after sign-in. Operators review it on{" "}
              <Link href="/dashboard/demo-usage" className="font-medium text-foreground underline-offset-4 hover:underline">
                /dashboard/demo-usage
              </Link>
              .
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-lg">Suggested test persona</CardTitle>
            <CardDescription>Use these values for a consistent walkthrough.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed sm:text-base">
            <p>
              <span className="font-medium">Name:</span> Michael · <span className="font-medium">Age:</span> 58 ·{" "}
              <span className="font-medium">Retire in:</span> 6 years
            </p>
            <p>
              <span className="font-medium">Concern:</span> Social Security ·{" "}
              <span className="font-medium">Savings:</span> $100k-$500k
            </p>
            <p>
              <span className="font-medium">Try:</span> expand Social Security on Step 2, open AI help chat, tap
              Generate AI brief on dashboard, then open Demo usage (/dashboard/demo-usage) for your session.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-lg">Simulated ad entry points</CardTitle>
            <CardDescription>UTM-tagged landing URLs fire view with source.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button variant="outline" className="h-11 w-full justify-start gap-2 sm:h-auto" nativeButton={false} render={<Link href="/?utm_source=meta" />}>
              Quiz from Meta ad
              <ExternalLink className="ml-auto size-4 opacity-50" aria-hidden />
            </Button>
            <Button variant="outline" className="h-11 w-full justify-start gap-2 sm:h-auto" nativeButton={false} render={<Link href="/?utm_source=taboola" />}>
              Quiz from Taboola ad
              <ExternalLink className="ml-auto size-4 opacity-50" aria-hidden />
            </Button>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:flex-wrap sm:justify-center">
          <Button size="lg" className="h-12 w-full gap-1.5 sm:w-auto" nativeButton={false} render={<Link href="/?utm_source=meta" />}>
            Start visitor quiz
            <ArrowRight className="size-4" aria-hidden />
          </Button>
          <Button size="lg" variant="outline" className="h-12 w-full gap-1.5 sm:w-auto" nativeButton={false} render={<Link href="/dashboard" />}>
            <BarChart3 className="size-4" aria-hidden />
            Open marketing dashboard
          </Button>
          <Button size="lg" variant="outline" className="h-12 w-full gap-1.5 sm:w-auto" nativeButton={false} render={<Link href="/dashboard/demo-usage" />}>
            <UserCheck className="size-4" aria-hidden />
            View demo usage
          </Button>
        </div>

        <p className="flex flex-wrap items-center justify-center gap-2 pb-6 text-center text-xs text-muted-foreground">
          <Sparkles className="size-3.5" aria-hidden />
          Verify Unomi + LLM: npm run verify:integrations · Full test suite: npm run test:all:local
        </p>
      </div>
    </div>
  );
}
