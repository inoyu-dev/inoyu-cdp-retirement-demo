"use client";

import {
  BookOpen,
  Clock3,
  Fingerprint,
  Globe,
  Languages,
  Layers3,
  Mail,
  MapPin,
  PiggyBank,
  Route,
  ShieldQuestion,
  Timer,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CONTACT_CHANNEL_LABELS } from "@/lib/contact-channels";
import { formatDashboardTime } from "@/lib/dashboard-utils";
import { LOCALE_NATIVE_NAMES } from "@/lib/i18n";
import {
  CONCERN_META,
  SAVINGS_TIER_PROGRESS,
  TRAFFIC_SOURCE_META,
} from "@/lib/profile-display";
import { CONCERN_LABELS, SAVINGS_LABELS } from "@/lib/quiz";
import { countryDisplayName, VISITOR_REGION_LABELS } from "@/lib/region";
import type { AppLocale, ContactChannel, PrimaryConcern, VisitorProfile, VisitorRegion } from "@/lib/types";
import { cn } from "@/lib/utils";

type PropertyCardProps = {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
  accent?: string;
  className?: string;
  footer?: React.ReactNode;
};

function PropertyCard({ icon, label, value, hint, accent, className, footer }: PropertyCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/60 bg-card/70 p-4 shadow-sm transition-colors hover:border-primary/25 hover:bg-card",
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-4 -top-4 size-16 rounded-full bg-primary/5 blur-2xl transition-opacity group-hover:opacity-100" />
      <div className="relative flex items-start gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40",
            accent,
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <div className="text-sm font-semibold leading-snug text-foreground">{value}</div>
          {hint ? <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
          {footer}
        </div>
      </div>
    </div>
  );
}

function SavingsMeter({ tier }: { tier: keyof typeof SAVINGS_TIER_PROGRESS | undefined }) {
  const pct = tier ? SAVINGS_TIER_PROGRESS[tier] : 0;
  return (
    <div className="mt-2 space-y-1.5">
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-chart-4 via-chart-2 to-chart-3"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>&lt;$100k</span>
        <span>$100k–500k</span>
        <span>$500k+</span>
      </div>
    </div>
  );
}

type Props = { profile: VisitorProfile };

export default function ProfileAttributesPanel({ profile }: Props) {
  const region = (profile.contactRegion ?? profile.detectedRegion) as VisitorRegion | undefined;
  const concern = profile.quiz?.primaryConcern as PrimaryConcern | undefined;
  const concernMeta = concern ? CONCERN_META[concern] : null;
  const traffic = TRAFFIC_SOURCE_META[profile.trafficSource];
  const savingsTier = profile.quiz?.currentSavings;

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Profile attributes</h3>
        <p className="text-sm text-muted-foreground">
          Structured view of acquisition, identity, quiz answers, and engagement signals.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <PropertyCard
          icon={<Route className="size-4 text-violet-600 dark:text-violet-300" aria-hidden />}
          label="Acquisition"
          accent={traffic.bg}
          value={traffic.label}
          hint={
            profile.utmCampaign
              ? `Campaign: ${profile.utmCampaign}`
              : "No campaign tag on first visit"
          }
        />

        <PropertyCard
          icon={<TrendingUp className="size-4 text-primary" aria-hidden />}
          label="Lead score"
          value={
            <span className="text-2xl tabular-nums">{profile.leadScore}</span>
          }
          footer={
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/80"
                style={{ width: `${Math.min(100, profile.leadScore)}%` }}
              />
            </div>
          }
        />

        <PropertyCard
          icon={<MapPin className="size-4 text-sky-600 dark:text-sky-300" aria-hidden />}
          label="Region"
          value={region ? VISITOR_REGION_LABELS[region] : "Unknown"}
          hint={
            profile.contactRegion &&
            profile.detectedRegion &&
            profile.contactRegion !== profile.detectedRegion
              ? `Detected ${VISITOR_REGION_LABELS[profile.detectedRegion]} · visitor chose ${VISITOR_REGION_LABELS[profile.contactRegion]}`
              : profile.countryCode
                ? `IP country: ${countryDisplayName(profile.countryCode)}`
                : undefined
          }
        />

        {profile.preferredLanguage ? (
          <PropertyCard
            icon={<Languages className="size-4 text-indigo-600 dark:text-indigo-300" aria-hidden />}
            label="Language"
            value={LOCALE_NATIVE_NAMES[profile.preferredLanguage as AppLocale]}
          />
        ) : null}

        {concern ? (
          <PropertyCard
            icon={<ShieldQuestion className={cn("size-4", concernMeta?.accent)} aria-hidden />}
            label="Primary concern"
            accent={concernMeta?.bg}
            value={CONCERN_LABELS[concern]}
          />
        ) : null}

        {savingsTier ? (
          <PropertyCard
            icon={<PiggyBank className="size-4 text-emerald-600 dark:text-emerald-300" aria-hidden />}
            label="Savings band"
            value={SAVINGS_LABELS[savingsTier]}
            footer={<SavingsMeter tier={savingsTier} />}
          />
        ) : null}

        {profile.quiz?.email ? (
          <PropertyCard
            icon={<Mail className="size-4 text-primary" aria-hidden />}
            label="Contact email"
            value={<span className="break-all font-mono text-xs">{profile.quiz.email}</span>}
            hint={
              profile.quiz.contactChannel
                ? `Preferred channel: ${CONTACT_CHANNEL_LABELS[profile.quiz.contactChannel as ContactChannel]}`
                : undefined
            }
          />
        ) : null}

        <PropertyCard
          icon={<BookOpen className="size-4 text-amber-600 dark:text-amber-300" aria-hidden />}
          label="Content engagement"
          value={`${profile.contentEngagement.socialSecurityViews + profile.contentEngagement.rolloverViews} reads`}
          hint={`Social Security ${profile.contentEngagement.socialSecurityViews} · Rollover ${profile.contentEngagement.rolloverViews} · ${profile.contentEngagement.totalDwellSeconds}s dwell`}
        />

        <PropertyCard
          icon={<Globe className="size-4 text-muted-foreground" aria-hidden />}
          label="Page views"
          value={profile.pageViews}
          hint={`Last active ${formatDashboardTime(profile.updatedAt)}`}
        />

        <PropertyCard
          icon={<Layers3 className="size-4 text-chart-2" aria-hidden />}
          label="Quiz variant"
          value={profile.quizVariantId ?? "control"}
        />

        <PropertyCard
          icon={<Fingerprint className="size-4 text-muted-foreground" aria-hidden />}
          label="Identifiers"
          value={
            <div className="space-y-1 font-mono text-[11px] leading-relaxed">
              <p className="truncate" title={profile.profileId}>ID {profile.profileId.slice(0, 18)}…</p>
              {profile.unomiProfileId ? (
                <p className="truncate text-muted-foreground" title={profile.unomiProfileId}>
                  Unomi {profile.unomiProfileId.slice(0, 18)}…
                </p>
              ) : null}
            </div>
          }
        />

        {profile.quizFunnel ? (
          <PropertyCard
            icon={<Timer className="size-4 text-primary" aria-hidden />}
            label="Funnel position"
            value={
              profile.quizFunnel.completed
                ? "Completed quiz"
                : profile.quizFunnel.abandonedAtStep
                  ? `Abandoned at step ${profile.quizFunnel.abandonedAtStep}`
                  : profile.quizFunnel.maxStepReached
                    ? `Reached step ${profile.quizFunnel.maxStepReached}`
                    : "Browsing"
            }
            hint={
              profile.quizFunnel.lastStepEnteredAt
                ? `Last step entry ${formatDashboardTime(profile.quizFunnel.lastStepEnteredAt)}`
                : undefined
            }
          />
        ) : null}
      </div>

      {profile.segments.length > 0 ? (
        <Card className="border-border/60 bg-muted/15">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock3 className="size-4 text-primary" aria-hidden />
              CDP segments
            </CardTitle>
            <CardDescription>Audience tags applied to this profile</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {profile.segments.map((segment) => (
                <Badge key={segment} variant="secondary" className="rounded-full px-3 py-1 capitalize">
                  {segment.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
