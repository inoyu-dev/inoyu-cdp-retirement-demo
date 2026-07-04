"use client";

import { ClipboardList, ListChecks, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import StatCard from "@/components/dashboard/StatCard";
import { CONTACT_CHANNEL_LABELS } from "@/lib/contact-channels";
import { formatDashboardTime } from "@/lib/dashboard-utils";
import { describeEventForMarketer } from "@/lib/event-narration";
import { LOCALE_NATIVE_NAMES } from "@/lib/i18n";
import { CONCERN_LABELS, SAVINGS_LABELS } from "@/lib/quiz";
import { pointerComfortLabel, technicalComfortLabel } from "@/lib/quiz-engagement";
import { countryDisplayName, VISITOR_REGION_LABELS } from "@/lib/region";
import type { AiSummary, AppLocale, ContactChannel, VisitorProfile, VisitorRegion } from "@/lib/types";

type Props = {
  profile: VisitorProfile;
  summary: AiSummary | null;
  loadingSummary: boolean;
};

export default function VisitorProfileDetail({ profile, summary, loadingSummary }: Props) {
  return (
    <div className="min-w-0 space-y-6">
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Profile snapshot</h2>
          <p className="text-sm text-muted-foreground">
            Session {profile.profileId.slice(0, 8)}…
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Source" value={profile.trafficSource} />
          <StatCard label="Lead score" value={profile.leadScore} />
          <StatCard label="Quiz score" value={profile.quiz?.score ?? "—"} />
          <StatCard
            label="Converted"
            value={profile.converted ? (profile.conversionType ?? "Yes") : "No"}
          />
          <StatCard label="SS views" value={profile.contentEngagement.socialSecurityViews} />
          <StatCard label="Rollover views" value={profile.contentEngagement.rolloverViews} />
          <StatCard
            label="Region"
            value={
              profile.contactRegion ?? profile.detectedRegion
                ? VISITOR_REGION_LABELS[
                    (profile.contactRegion ?? profile.detectedRegion) as VisitorRegion
                  ]
                : "—"
            }
          />
          {profile.countryCode ? (
            <StatCard label="IP country" value={countryDisplayName(profile.countryCode)} />
          ) : null}
          {profile.preferredLanguage ? (
            <StatCard
              label="Language"
              value={LOCALE_NATIVE_NAMES[profile.preferredLanguage as AppLocale]}
            />
          ) : null}
        </div>
        {profile.quiz ? (
          <Card className="border-border/60 bg-muted/20">
            <CardContent className="space-y-3 pt-6">
              <p className="text-sm leading-relaxed">
                {profile.quiz.firstName}, age {profile.quiz.age}, retires in {profile.quiz.retireYears}y ·{" "}
                {profile.quiz.primaryConcern ? CONCERN_LABELS[profile.quiz.primaryConcern] : "—"} ·{" "}
                {profile.quiz.currentSavings ? SAVINGS_LABELS[profile.quiz.currentSavings] : "—"}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {(profile.contactRegion ?? profile.detectedRegion) ? (
                  <Badge variant="outline">
                    Region:{" "}
                    {
                      VISITOR_REGION_LABELS[
                        (profile.contactRegion ?? profile.detectedRegion) as VisitorRegion
                      ]
                    }
                    {profile.contactRegion &&
                    profile.detectedRegion &&
                    profile.contactRegion !== profile.detectedRegion
                      ? " (overridden)"
                      : ""}
                  </Badge>
                ) : null}
                {profile.quiz.contactChannel ? (
                  <Badge variant="default">
                    Channel: {CONTACT_CHANNEL_LABELS[profile.quiz.contactChannel as ContactChannel]}
                  </Badge>
                ) : null}
                {profile.segments.map((s) => (
                  <Badge key={s} variant="secondary">
                    {s.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </section>

      <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/20 via-card to-chart-2/15 shadow-md">
        <div className="h-1 bg-gradient-to-r from-primary via-chart-2 to-chart-3" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" aria-hidden />
            AI agent brief
          </CardTitle>
          <CardDescription>AI brief for the next conversation</CardDescription>
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
              <div>
                <h3 className="text-xl font-semibold">{summary.headline}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{summary.narrative}</p>
              </div>
              <Separator className="bg-border/60" />
              <div>
                <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <ListChecks className="size-4 text-primary" aria-hidden />
                  Recommended next steps
                </p>
                <ol className="space-y-2">
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
              <p className="text-sm">
                <span className="font-medium">Approach:</span> {summary.recommendedApproach}
              </p>
              <p className="rounded-lg border border-border/50 bg-background/40 p-3 text-sm">
                <span className="font-medium">Suggested opener:</span> {summary.suggestedOpener}
              </p>
              <ul className="space-y-2 text-sm">
                {summary.signals.map((s) => (
                  <li key={s} className="flex gap-2 text-muted-foreground">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    {s}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </CardContent>
      </Card>

      {profile.quizEngagement && profile.quizEngagement.stepSummaries.length > 0 ? (
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Quiz behavior</CardTitle>
            <CardDescription>
              Time on each step, activity, typing pace, and pointer precision (miss-clicks and movement corrections — no content stored).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {technicalComfortLabel(profile.quizEngagement.overallTechnicalComfort)}
              </Badge>
              <Badge variant="secondary">
                {pointerComfortLabel(profile.quizEngagement.overallPointerComfort ?? "unknown")}
              </Badge>
              <Badge variant="outline">{profile.quizEngagement.totalDurationSeconds}s total</Badge>
              <Badge variant="outline">
                Engagement {profile.quizEngagement.avgEngagementScore}/100
              </Badge>
            </div>
            <ul className="space-y-2 text-sm">
              {profile.quizEngagement.stepSummaries.map((s) => (
                <li
                  key={s.step}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                >
                  <span className="font-medium">Step {s.step}</span>
                  <span className="text-muted-foreground">
                    {s.durationSeconds}s ({s.activeSeconds}s active) · {s.mouseMovements} moves
                    {s.avgTypingIntervalMs ? ` · ~${s.avgTypingIntervalMs}ms/keystroke` : ""}
                    {s.impreciseClicks ? ` · ${s.impreciseClicks} miss-clicks` : ""}
                    {s.correctiveMovements ? ` · ${s.correctiveMovements} corrections` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="size-5 text-muted-foreground" aria-hidden />
            Visitor journey
          </CardTitle>
          <CardDescription>
            Plain-language timeline — what this person did, newest first.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          <ScrollArea className="h-[min(420px,50vh)] px-6">
            <ol className="space-y-1 pb-4">
              {[...profile.events].reverse().map((ev, idx) => {
                const story = describeEventForMarketer(ev);
                return (
                  <li key={ev.id}>
                    {idx > 0 ? <Separator className="my-4 bg-border/60" /> : null}
                    <div className="flex gap-3">
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <p className="font-medium leading-snug">{story.headline}</p>
                          <time
                            dateTime={ev.timestamp}
                            className="text-xs tabular-nums text-muted-foreground"
                          >
                            {formatDashboardTime(ev.timestamp)}
                          </time>
                        </div>
                        {story.detail ? (
                          <p className="text-sm leading-relaxed text-muted-foreground">{story.detail}</p>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
