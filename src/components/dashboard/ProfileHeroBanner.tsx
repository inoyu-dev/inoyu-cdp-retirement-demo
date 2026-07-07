"use client";

import {
  CalendarClock,
  CheckCircle2,
  Globe2,
  Megaphone,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import ScoreRingAnimation from "@/components/svg/ScoreRingAnimation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDashboardTime } from "@/lib/dashboard-utils";
import {
  getLeadScoreTier,
  getProfileInitials,
  getScoreTier,
  getVisitorDisplayName,
  TRAFFIC_SOURCE_META,
} from "@/lib/profile-display";
import { CONTACT_CHANNEL_LABELS } from "@/lib/contact-channels";
import type { ContactChannel, VisitorProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = { profile: VisitorProfile };

export default function ProfileHeroBanner({ profile }: Props) {
  const quiz = profile.quiz;
  const score = quiz?.score;
  const scoreTier = getScoreTier(score);
  const leadTier = getLeadScoreTier(profile.leadScore);
  const traffic = TRAFFIC_SOURCE_META[profile.trafficSource];
  const retireAge =
    quiz?.age !== undefined && quiz?.retireYears !== undefined
      ? quiz.age + quiz.retireYears
      : null;

  const displayName = getVisitorDisplayName(profile);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary/15 via-card to-chart-2/10 shadow-lg">
      <div
        className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-chart-2/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-10 size-48 rounded-full bg-primary/15 blur-3xl"
        aria-hidden
      />
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-chart-2 to-chart-3" />

      <div className="relative grid gap-6 p-4 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex min-w-0 flex-col gap-4 text-center sm:flex-row sm:items-center sm:gap-5 sm:text-left">
          <Avatar className="mx-auto size-16 border-2 sm:mx-0 sm:size-20 border-background/80 shadow-md ring-4 ring-primary/10">
            <AvatarFallback className="bg-gradient-to-br from-primary to-chart-2 text-2xl font-semibold text-primary-foreground">
              {getProfileInitials(profile)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 space-y-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Visitor profile
              </p>
              <h2 className="truncate font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
                {displayName === "Anonymous" ? "Anonymous visitor" : displayName}
              </h2>
              <p className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                <span className="block sm:inline">
                  Session{" "}
                  <span className="font-mono text-foreground/80">{profile.sessionId.slice(0, 12)}…</span>
                </span>
                <span className="hidden sm:inline"> · </span>
                <span className="block sm:inline">First seen {formatDashboardTime(profile.createdAt)}</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className={cn("gap-1.5 border", traffic.bg, traffic.accent)}>
                <Megaphone className="size-3.5" aria-hidden />
                {traffic.label}
              </Badge>
              {profile.converted ? (
                <Badge className="gap-1.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="size-3.5" aria-hidden />
                  Converted · {profile.conversionType?.replace(/_/g, " ") ?? "yes"}
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1.5">
                  <Target className="size-3.5" aria-hidden />
                  Not converted yet
                </Badge>
              )}
              {quiz?.contactChannel ? (
                <Badge variant="secondary" className="gap-1.5">
                  <Globe2 className="size-3.5" aria-hidden />
                  {CONTACT_CHANNEL_LABELS[quiz.contactChannel as ContactChannel]}
                </Badge>
              ) : null}
              {profile.segments.slice(0, 3).map((segment) => (
                <Badge key={segment} variant="outline" className="capitalize">
                  {segment.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="grid w-full gap-4 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-center sm:gap-6 lg:justify-end">
          <div className="relative mx-auto flex flex-col items-center sm:mx-0">
            {score !== null && score !== undefined ? (
              <>
                <div className="relative">
                  <ScoreRingAnimation score={score} size={112} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center sm:hidden">
                    <span className="text-2xl font-bold tabular-nums">{score}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Quiz score</span>
                  </div>
                  <div className="absolute inset-0 hidden flex-col items-center justify-center sm:flex">
                    <span className="text-3xl font-bold tabular-nums">{score}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Quiz score</span>
                  </div>
                </div>
                <p className={cn("mt-2 text-xs font-medium", scoreTier.tone)}>{scoreTier.label}</p>
              </>
            ) : (
              <div className="flex size-28 sm:size-[132px] flex-col items-center justify-center rounded-full border border-dashed border-border/70 bg-background/40">
                <Sparkles className="size-6 text-muted-foreground" aria-hidden />
                <span className="mt-2 text-xs text-muted-foreground">Quiz pending</span>
              </div>
            )}
          </div>

          <div className="w-full space-y-3 rounded-xl border border-border/60 bg-background/50 p-4 backdrop-blur-sm sm:min-w-[8.5rem] sm:w-auto">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Lead score</p>
              <p className="text-2xl font-semibold tabular-nums">{profile.leadScore}</p>
              <p className="text-xs text-muted-foreground">{leadTier.label}</p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary via-chart-2 to-chart-3 transition-all"
                style={{ width: `${leadTier.pct}%` }}
              />
            </div>
            {retireAge ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarClock className="size-3.5 shrink-0" aria-hidden />
                Target retire ~{retireAge}
                {quiz?.age ? ` (age ${quiz.age})` : ""}
              </div>
            ) : quiz?.age ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <UserRound className="size-3.5 shrink-0" aria-hidden />
                Age {quiz.age}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
