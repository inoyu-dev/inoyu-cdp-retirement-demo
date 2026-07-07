import type { PrimaryConcern, TrafficSource, VisitorProfile } from "./types";

export const TRAFFIC_SOURCE_META: Record<
  TrafficSource,
  { label: string; accent: string; bg: string }
> = {
  meta: {
    label: "Meta ads",
    accent: "text-blue-600 dark:text-blue-300",
    bg: "bg-blue-500/10 border-blue-500/25",
  },
  taboola: {
    label: "Taboola",
    accent: "text-orange-600 dark:text-orange-300",
    bg: "bg-orange-500/10 border-orange-500/25",
  },
  google: {
    label: "Google ads",
    accent: "text-emerald-600 dark:text-emerald-300",
    bg: "bg-emerald-500/10 border-emerald-500/25",
  },
  direct: {
    label: "Direct visit",
    accent: "text-violet-600 dark:text-violet-300",
    bg: "bg-violet-500/10 border-violet-500/25",
  },
};

export const CONCERN_META: Record<
  PrimaryConcern,
  { label: string; accent: string; bg: string }
> = {
  social_security: {
    label: "Social Security timing",
    accent: "text-sky-600 dark:text-sky-300",
    bg: "bg-sky-500/10 border-sky-500/20",
  },
  "401k_rollover": {
    label: "401(k) rollover",
    accent: "text-indigo-600 dark:text-indigo-300",
    bg: "bg-indigo-500/10 border-indigo-500/20",
  },
  healthcare_costs: {
    label: "Healthcare costs",
    accent: "text-rose-600 dark:text-rose-300",
    bg: "bg-rose-500/10 border-rose-500/20",
  },
  timeline_uncertainty: {
    label: "Retirement timeline",
    accent: "text-amber-600 dark:text-amber-300",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
};

export const SAVINGS_TIER_PROGRESS: Record<
  "under_100k" | "100k_500k" | "500k_plus",
  number
> = {
  under_100k: 25,
  "100k_500k": 55,
  "500k_plus": 90,
};

export function getProfileInitials(profile: VisitorProfile): string {
  const name = getVisitorDisplayName(profile);
  if (name !== "Anonymous") {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return profile.profileId.slice(0, 2).toUpperCase();
}

/** Visitor-facing label for dashboard lists (quiz first name when available). */
export function getVisitorDisplayName(profile: VisitorProfile): string {
  const name = profile.quiz?.firstName?.trim();
  return name || "Anonymous";
}

export function getScoreTier(score: number | null | undefined): {
  label: string;
  tone: string;
  ring: string;
} {
  if (score === null || score === undefined) {
    return {
      label: "Pending",
      tone: "text-muted-foreground",
      ring: "oklch(0.68 0.02 260 / 0.35)",
    };
  }
  if (score >= 75) {
    return {
      label: "Strong readiness",
      tone: "text-emerald-600 dark:text-emerald-300",
      ring: "oklch(0.62 0.12 180)",
    };
  }
  if (score >= 55) {
    return {
      label: "Moderate readiness",
      tone: "text-amber-600 dark:text-amber-300",
      ring: "oklch(0.72 0.14 85)",
    };
  }
  return {
    label: "Needs attention",
    tone: "text-rose-600 dark:text-rose-300",
    ring: "oklch(0.577 0.245 27.325)",
  };
}

export function getLeadScoreTier(score: number): { label: string; pct: number } {
  const pct = Math.min(100, Math.max(0, score));
  if (pct >= 70) return { label: "Hot lead", pct };
  if (pct >= 40) return { label: "Warm lead", pct };
  return { label: "Early stage", pct };
}

export type EventTimelineMeta = {
  category: "visit" | "quiz" | "content" | "chat" | "sms" | "conversion" | "system";
  accent: string;
  bg: string;
  border: string;
};

export function getEventTimelineMeta(eventType: string): EventTimelineMeta {
  if (eventType === "view" || eventType === "quizVariantAssigned") {
    return {
      category: "visit",
      accent: "text-violet-600 dark:text-violet-300",
      bg: "bg-violet-500/15",
      border: "border-violet-500/30",
    };
  }
  if (eventType.startsWith("quiz") || eventType === "quizCompleted") {
    return {
      category: "quiz",
      accent: "text-primary",
      bg: "bg-primary/15",
      border: "border-primary/30",
    };
  }
  if (eventType === "contentEngagement") {
    return {
      category: "content",
      accent: "text-sky-600 dark:text-sky-300",
      bg: "bg-sky-500/15",
      border: "border-sky-500/30",
    };
  }
  if (eventType.startsWith("quizChat") || eventType === "humanChatRequested") {
    return {
      category: "chat",
      accent: "text-emerald-600 dark:text-emerald-300",
      bg: "bg-emerald-500/15",
      border: "border-emerald-500/30",
    };
  }
  if (eventType.startsWith("sms")) {
    return {
      category: "sms",
      accent: "text-amber-600 dark:text-amber-300",
      bg: "bg-amber-500/15",
      border: "border-amber-500/30",
    };
  }
  if (eventType === "conversion") {
    return {
      category: "conversion",
      accent: "text-emerald-600 dark:text-emerald-300",
      bg: "bg-emerald-500/15",
      border: "border-emerald-500/30",
    };
  }
  return {
    category: "system",
    accent: "text-muted-foreground",
    bg: "bg-muted/60",
    border: "border-border/60",
  };
}
