"use client";

import { ListChecks, Loader2, Sparkles } from "lucide-react";
import AiGenerateButton, { type AiContentSource } from "@/components/AiGenerateButton";
import ProfileAttributesPanel from "@/components/dashboard/ProfileAttributesPanel";
import ProfileEngagementPanel from "@/components/dashboard/ProfileEngagementPanel";
import ProfileHeroBanner from "@/components/dashboard/ProfileHeroBanner";
import ProfileJourneyTimeline from "@/components/dashboard/ProfileJourneyTimeline";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { AiSummary, VisitorProfile } from "@/lib/types";

type Props = {
  profile: VisitorProfile;
  summary: AiSummary | null;
  loadingSummary: boolean;
  aiAvailable: boolean;
  summarySource: AiContentSource | null;
  generatingSummary: boolean;
  onGenerateSummary: () => void;
};

export default function VisitorProfileDetail({
  profile,
  summary,
  loadingSummary,
  aiAvailable,
  summarySource,
  generatingSummary,
  onGenerateSummary,
}: Props) {
  return (
    <div className="min-w-0 space-y-6 sm:space-y-8">
      <ProfileHeroBanner profile={profile} />
      <ProfileAttributesPanel profile={profile} />

      <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/20 via-card to-chart-2/15 shadow-md">
        <div className="h-1 bg-gradient-to-r from-primary via-chart-2 to-chart-3" />
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" aria-hidden />
                AI agent brief
              </CardTitle>
              <CardDescription>On-demand coaching brief for the next conversation</CardDescription>
            </div>
            <AiGenerateButton
              aiAvailable={aiAvailable}
              source={summarySource}
              generating={generatingSummary}
              onGenerate={onGenerateSummary}
              label="Generate brief with AI"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pb-6">
          {loadingSummary && !summary ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Generating brief…
            </p>
          ) : null}
          {summary ? (
            <>
              <div className="rounded-xl border border-border/50 bg-background/40 p-4 sm:p-5">
                <h3 className="font-heading text-xl font-semibold">{summary.headline}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{summary.narrative}</p>
              </div>
              <Separator className="bg-border/60" />
              <div>
                <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <ListChecks className="size-4 text-primary" aria-hidden />
                  Recommended next steps
                </p>
                <ol className="grid gap-2 sm:grid-cols-2">
                  {summary.marketerNextSteps.map((step, i) => (
                    <li
                      key={i}
                      className="flex gap-2 rounded-lg border border-border/50 bg-background/40 p-3 text-sm leading-relaxed"
                    >
                      <span className="font-semibold tabular-nums text-primary">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <p className="rounded-lg border border-border/50 bg-background/40 p-3 text-sm">
                  <span className="font-medium">Approach:</span> {summary.recommendedApproach}
                </p>
                <p className="rounded-lg border border-border/50 bg-background/40 p-3 text-sm">
                  <span className="font-medium">Suggested opener:</span> {summary.suggestedOpener}
                </p>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {summary.signals.map((s) => (
                  <li
                    key={s}
                    className="flex gap-2 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-sm text-muted-foreground"
                  >
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    {s}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </CardContent>
      </Card>

      <ProfileEngagementPanel profile={profile} />
      <ProfileJourneyTimeline profile={profile} />
    </div>
  );
}
