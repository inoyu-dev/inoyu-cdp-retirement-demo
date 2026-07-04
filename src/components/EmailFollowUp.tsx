"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Inbox, Loader2, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { AiSummary, VisitorProfile } from "@/lib/types";

type Props = { profileId: string; profile: VisitorProfile };

export default function EmailFollowUp({ profileId, profile }: Props) {
  const [summary, setSummary] = useState<AiSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const firstName = profile.quiz?.firstName ?? "there";
  const email = profile.quiz?.email ?? "you@email.com";
  const score = profile.quiz?.score;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/summary?profileId=${encodeURIComponent(profileId)}`, {
        cache: "no-store",
      });
      if (!res.ok || cancelled) {
        if (!cancelled) setLoading(false);
        return;
      }
      const data = (await res.json()) as { summary: AiSummary };
      if (!cancelled) {
        setSummary(data.summary);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const subject =
    score !== null && score !== undefined
      ? `Your retirement score: ${score}/100`
      : "Your free retirement readiness summary";

  return (
    <div className="mesh-hero min-h-[calc(100vh-8rem)]">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="mb-8 space-y-3 text-center">
          <Badge variant="secondary" className="rounded-full px-3 py-1 text-base">
            <Mail className="mr-1.5 size-4" aria-hidden />
            Email follow-up
          </Badge>
          <h1 className="text-3xl font-semibold sm:text-4xl">Thank you, {firstName}!</h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            You chose email. Below is a preview of what we would send to{" "}
            <span className="font-medium text-foreground">{email}</span>.
          </p>
        </div>

        <Card className="overflow-hidden border-border/70 shadow-lg" role="region" aria-label="Email inbox preview">
          <div className="flex items-center gap-3 border-b bg-muted/40 px-4 py-3">
            <Inbox className="size-5 text-muted-foreground" aria-hidden />
            <span className="text-base font-medium">Inbox preview</span>
          </div>
          <CardHeader className="space-y-1 pb-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">From:</span> Your Retirement Guide
              &lt;hello@retirement-guide.example&gt;
            </p>
            <CardTitle className="text-xl">{subject}</CardTitle>
            <CardDescription className="text-base">To: {email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-8 text-base leading-relaxed">
            <p>Hi {firstName},</p>
            {loading && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Preparing your personalized summary…
              </p>
            )}
            {summary && (
              <>
                <p className="rounded-lg border border-primary/20 bg-primary/5 p-4 leading-relaxed">
                  {summary.empatheticResponse}
                </p>
                <p>{summary.suggestedOpener}</p>
                <Separator />
                <p className="text-muted-foreground">{summary.narrative}</p>
                {summary.visitorNextSteps.length > 0 && (
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm">
                    <p className="font-semibold text-foreground">Your next steps</p>
                    <ol className="mt-2 space-y-2">
                      {summary.visitorNextSteps.map((step, i) => (
                        <li key={i} className="leading-relaxed text-muted-foreground">
                          {i + 1}. {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </>
            )}
            {!loading && !summary && (
              <p>
                Thanks for completing the quiz. Your readiness score is{" "}
                {score !== null && score !== undefined ? `${score} out of 100` : "being calculated"}.
                Reply to this email anytime with questions — no pressure.
              </p>
            )}
          </CardContent>
        </Card>

        <p className="mt-8 text-center">
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/" />}>
            <ArrowLeft className="size-4" aria-hidden />
            Back to home
          </Button>
        </p>
      </div>
    </div>
  );
}
