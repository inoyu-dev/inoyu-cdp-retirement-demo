import Link from "next/link";
import { ArrowRight, BarChart3, ExternalLink, ListOrdered } from "lucide-react";
import DemoFlowGuide from "@/components/DemoFlowGuide";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HowItWorksPage() {
  return (
    <div className="mesh-hero min-h-[calc(100vh-8rem)]">
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6 lg:py-14">
        <header className="space-y-4 text-center">
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            <ListOrdered className="mr-1.5 size-3.5" aria-hidden />
            Contest walkthrough
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">How it works</h1>
          <p className="mx-auto max-w-xl text-lg leading-relaxed text-muted-foreground">
            This build has two product surfaces: the <strong className="font-medium text-foreground">visitor quiz</strong>{" "}
            (pre-retiree UX) and the <strong className="font-medium text-foreground">marketing dashboard</strong>{" "}
            (media buyer UX). Everything else on the site stays in character — instructions for judges live here only.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Visitor experience</CardTitle>
              <CardDescription>Target customer — age 50s–60s, plain language, channel of choice.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              4-step quiz → score reveal → personalized follow-up (email, SMS, WhatsApp, LINE, call-back, or on-page). Step 1 includes language choice: English, Spanish, Chinese, French, or Japanese.
            </CardContent>
          </Card>
          <Card className="border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Marketing experience</CardTitle>
              <CardDescription>Media buyer — live profile, segments, AI brief, event timeline.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              Open in a second tab while the visitor completes the quiz. Polls every 2s. Step timing, mouse activity, typing pace, miss-clicks, and movement corrections fire as quizStepEngagement events (pointer + keyboard comfort).
            </CardContent>
          </Card>
        </div>

        <Card id="unomi-mock" className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-lg">Apache Unomi — mocked for this submission</CardTitle>
            <CardDescription>
              Time constraint note for judges — not shown on the visitor or marketer product surfaces.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Remote Apache Unomi hosting was not completed before the contest deadline. Instead, this build uses a{" "}
              <strong className="font-medium text-foreground">local Unomi-compatible CDP store</strong> (same event
              types, profile shape, segments, and dashboard agent tools) so the full paid-media loop remains demoable end
              to end.
            </p>
            <p>
              Production wiring is already implemented: when a remote Unomi instance is connected, events mirror through{" "}
              <code className="text-xs">POST /cxs/context.json</code> with no UI changes. See{" "}
              <code className="text-xs">docs/DEPLOYMENT.md</code> for the deployment runbook.
            </p>
            <p>
              On the marketing dashboard, the integration badge reads <strong className="font-medium text-foreground">Contest demo</strong>{" "}
              with <strong className="font-medium text-foreground">Unomi mocked locally</strong> when the mock store is active.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-lg">Region-aware channels (IP detection)</CardTitle>
            <CardDescription>
              On quiz Step 3, the visitor&apos;s region is inferred from their IP address when the site is deployed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">United States</span> — email, browser push,
              SMS, phone callback, or on-page only.
            </p>
            <p>
              <span className="font-medium text-foreground">Asia-Pacific</span> — email, browser push,
              WhatsApp, LINE, or on-page only.
            </p>
            <p>
              <span className="font-medium text-foreground">Other regions</span> — email, browser push,
              WhatsApp, or on-page only.
            </p>
            <p>
              The visitor can change the detected region in Step 3; the marketing dashboard records both
              detected and selected region on the profile.
            </p>
          </CardContent>
        </Card>

        <DemoFlowGuide />

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-lg">Demo access (login gate)</CardTitle>
            <CardDescription>
              The site requires sign-in before the quiz or dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Password</span> — use the shared demo password provided by
              your operator. All testers use the same password.
            </p>
            <p>
              <span className="font-medium text-foreground">Your name</span> — any display name at{" "}
              <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
                /login
              </Link>{" "}
              (e.g. your first name). This identifies who is testing; it is not a separate account password.
            </p>
            <p>
              If you do not have credentials, ask whoever deployed the demo for access details.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-lg">Suggested test persona</CardTitle>
            <CardDescription>Use these values for a consistent walkthrough.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-base leading-relaxed">
            <p>
              <span className="font-medium">Name:</span> Michael · <span className="font-medium">Age:</span> 58 ·{" "}
              <span className="font-medium">Retire in:</span> 6 years
            </p>
            <p>
              <span className="font-medium">Concern:</span> Social Security ·{" "}
              <span className="font-medium">Savings:</span> $100k–$500k
            </p>
            <p>
              <span className="font-medium">Channel:</span> email or SMS · expand Social Security reading on quiz Step 2
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-lg">Simulated ad entry points</CardTitle>
            <CardDescription>UTM-tagged landing URLs — fires <code className="text-xs">view</code> with source.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="justify-start gap-2" nativeButton={false} render={<Link href="/?utm_source=meta" />}>
              Quiz from Meta ad
              <ExternalLink className="ml-auto size-4 opacity-50" aria-hidden />
            </Button>
            <Button variant="outline" className="justify-start gap-2" nativeButton={false} render={<Link href="/?utm_source=taboola" />}>
              Quiz from Taboola ad
              <ExternalLink className="ml-auto size-4 opacity-50" aria-hidden />
            </Button>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button size="lg" className="gap-1.5" nativeButton={false} render={<Link href="/?utm_source=meta" />}>
            Start visitor quiz
            <ArrowRight className="size-4" aria-hidden />
          </Button>
          <Button size="lg" variant="outline" className="gap-1.5" nativeButton={false} render={<Link href="/dashboard" />}>
            <BarChart3 className="size-4" aria-hidden />
            Open marketing dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
