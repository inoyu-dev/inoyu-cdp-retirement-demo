import { QUIZ_STEPS, type QuizStepId } from "./quiz-flow";
import type {
  QuizFunnelAggregate,
  QuizFunnelState,
  StepFunnelStats,
  VisitorProfile,
} from "./types";

const ACTIVE_WINDOW_MS = 10 * 60 * 1000;
const MIN_SAMPLE_FOR_HOTSPOT = 2;

function isQuizStep(value: unknown): value is QuizStepId {
  return typeof value === "number" && value >= 1 && value <= 4;
}

function maxStep(a: QuizStepId | undefined, b: QuizStepId): QuizStepId {
  if (a === undefined) return b;
  return Math.max(a, b) as QuizStepId;
}

/** Infer funnel position from engagement events when quizFunnel was not persisted. */
export function inferQuizFunnel(profile: VisitorProfile): QuizFunnelState {
  const completed = Boolean(profile.quiz?.completedAt);
  const stepSummaries = profile.quizEngagement?.stepSummaries ?? [];
  const maxFromEngagement =
    stepSummaries.length > 0
      ? (Math.max(...stepSummaries.map((s) => s.step)) as QuizStepId)
      : undefined;

  let abandonedAtStep: QuizStepId | undefined;
  let abandonedAt: string | undefined;

  if (!completed) {
    for (const event of profile.events) {
      if (event.eventType !== "quizStepEngagement") continue;
      if (event.properties.exitedVia !== "leave") continue;
      if (!isQuizStep(event.properties.step)) continue;
      abandonedAtStep = event.properties.step;
      abandonedAt = event.timestamp;
    }
  }

  const hasQuizActivity = profile.pageViews > 0 || stepSummaries.length > 0;
  const maxStepReached = completed ? 4 : maxFromEngagement ?? (hasQuizActivity ? 1 : undefined);
  const currentStep = completed
    ? 4
    : profile.quizFunnel?.currentStep ?? abandonedAtStep ?? maxStepReached;

  return {
    currentStep,
    maxStepReached,
    completed,
    abandonedAtStep: completed ? undefined : abandonedAtStep,
    abandonedAt: completed ? undefined : abandonedAt,
    lastStepEnteredAt: profile.quizFunnel?.lastStepEnteredAt,
  };
}

export function getEffectiveQuizFunnel(profile: VisitorProfile): QuizFunnelState {
  if (profile.quizFunnel) {
    return {
      ...inferQuizFunnel(profile),
      ...profile.quizFunnel,
      completed: Boolean(profile.quiz?.completedAt ?? profile.quizFunnel.completed),
    };
  }
  return inferQuizFunnel(profile);
}

export function applyFunnelEvent(
  profile: VisitorProfile,
  eventType: string,
  properties: Record<string, unknown>,
): QuizFunnelState {
  const existing = getEffectiveQuizFunnel(profile);
  const now = new Date().toISOString();
  const completed = Boolean(profile.quiz?.completedAt);

  if (eventType === "quizStepView" && isQuizStep(properties.step)) {
    const step = properties.step;
    return {
      ...existing,
      currentStep: step,
      maxStepReached: maxStep(existing.maxStepReached, step),
      lastStepEnteredAt: now,
      completed,
      abandonedAtStep: completed ? undefined : existing.abandonedAtStep,
      abandonedAt: completed ? undefined : existing.abandonedAt,
    };
  }

  if (eventType === "quizStepEngagement" && isQuizStep(properties.step)) {
    const step = properties.step;
    const next: QuizFunnelState = {
      ...existing,
      currentStep: step,
      maxStepReached: maxStep(existing.maxStepReached, step),
    };

    if (properties.exitedVia === "leave" && !completed) {
      next.abandonedAtStep = step;
      next.abandonedAt = now;
    }

    if (properties.exitedVia === "forward" || properties.exitedVia === "submit") {
      next.abandonedAtStep = undefined;
      next.abandonedAt = undefined;
    }

    return next;
  }

  if (eventType === "quizCompleted" || completed) {
    return {
      ...existing,
      currentStep: 4,
      maxStepReached: 4,
      completed: true,
      abandonedAtStep: undefined,
      abandonedAt: undefined,
    };
  }

  return existing;
}

function countLeaveExits(profile: VisitorProfile, step: QuizStepId): number {
  return profile.events.filter(
    (event) =>
      event.eventType === "quizStepEngagement" &&
      event.properties.step === step &&
      event.properties.exitedVia === "leave",
  ).length;
}

export function computeQuizFunnelAggregate(profiles: VisitorProfile[]): QuizFunnelAggregate {
  const quizVisitors = profiles.filter(
    (p) => p.pageViews > 0 || (p.quizEngagement?.stepSummaries.length ?? 0) > 0,
  );

  const completed = quizVisitors.filter((p) => getEffectiveQuizFunnel(p).completed).length;
  const abandoned = quizVisitors.filter((p) => {
    const funnel = getEffectiveQuizFunnel(p);
    return !funnel.completed && funnel.abandonedAtStep !== undefined;
  }).length;
  const inProgress = quizVisitors.length - completed - abandoned;

  const steps: StepFunnelStats[] = QUIZ_STEPS.map(({ id, title, hint }) => {
    let entered = 0;
    let activeNow = 0;
    let abandonedAtStep = 0;
    let leaveExits = 0;
    let durationTotal = 0;
    let durationCount = 0;
    let engagementTotal = 0;
    let engagementCount = 0;

    for (const profile of quizVisitors) {
      const funnel = getEffectiveQuizFunnel(profile);
      const reached = funnel.maxStepReached ?? 1;
      if (reached < id) continue;

      entered += 1;

      if (!funnel.completed && funnel.currentStep === id) {
        const ageMs = Date.now() - new Date(profile.updatedAt).getTime();
        if (ageMs <= ACTIVE_WINDOW_MS) activeNow += 1;
      }

      if (funnel.abandonedAtStep === id) abandonedAtStep += 1;
      leaveExits += countLeaveExits(profile, id);

      const summary = profile.quizEngagement?.stepSummaries.find((s) => s.step === id);
      if (summary) {
        durationTotal += summary.durationSeconds;
        durationCount += 1;
        engagementTotal += summary.engagementScore;
        engagementCount += 1;
      }
    }

    const dropOffRate =
      entered > 0 ? Math.round(((abandonedAtStep + leaveExits) / entered) * 100) / 100 : 0;

    return {
      step: id,
      title,
      hint,
      entered,
      activeNow,
      abandoned: abandonedAtStep,
      leaveExits,
      dropOffRate,
      avgDurationSeconds:
        durationCount > 0 ? Math.round(durationTotal / durationCount) : null,
      avgEngagementScore:
        engagementCount > 0 ? Math.round(engagementTotal / engagementCount) : null,
    };
  });

  let hotspotStep: QuizStepId | null = null;
  let hotspotScore = 0;

  for (const stepStats of steps) {
    if (stepStats.step === 4) continue;
    if (stepStats.entered < MIN_SAMPLE_FOR_HOTSPOT) continue;

    const score =
      stepStats.dropOffRate * 100 +
      stepStats.activeNow * 15 +
      (stepStats.avgDurationSeconds ?? 0) * 0.5;

    if (score > hotspotScore) {
      hotspotScore = score;
      hotspotStep = stepStats.step;
    }
  }

  const hotspotLabel =
    hotspotStep !== null
      ? (steps.find((s) => s.step === hotspotStep)?.title ?? null)
      : null;

  return {
    totalVisitors: quizVisitors.length,
    completed,
    inProgress,
    abandoned,
    completionRate:
      quizVisitors.length > 0
        ? Math.round((completed / quizVisitors.length) * 100) / 100
        : 0,
    steps,
    hotspotStep,
    hotspotLabel,
  };
}

export function profilesAtStep(
  profiles: VisitorProfile[],
  step: QuizStepId,
  mode: "active" | "abandoned" | "all",
): VisitorProfile[] {
  return profiles.filter((profile) => {
    const funnel = getEffectiveQuizFunnel(profile);
    if (mode === "active") {
      if (funnel.completed) return false;
      if (funnel.currentStep !== step) return false;
      const ageMs = Date.now() - new Date(profile.updatedAt).getTime();
      return ageMs <= ACTIVE_WINDOW_MS;
    }
    if (mode === "abandoned") {
      return !funnel.completed && funnel.abandonedAtStep === step;
    }
    return (funnel.maxStepReached ?? 0) >= step;
  });
}

export function buildFunnelEvidenceSnippets(
  profiles: VisitorProfile[],
  step: QuizStepId,
): string[] {
  const evidence: string[] = [];
  const relevant = [
    ...profilesAtStep(profiles, step, "abandoned"),
    ...profilesAtStep(profiles, step, "active"),
  ].slice(0, 6);

  for (const profile of relevant) {
    const funnel = getEffectiveQuizFunnel(profile);
    const summary = profile.quizEngagement?.stepSummaries.find((s) => s.step === step);
    const parts: string[] = [
      `${profile.quiz?.firstName ?? "Anonymous"} from ${profile.trafficSource}`,
    ];
    if (profile.preferredLanguage) parts.push(`lang ${profile.preferredLanguage}`);
    if (summary) {
      parts.push(`${summary.durationSeconds}s on step`);
      parts.push(`engagement ${summary.engagementScore}/100`);
      if (summary.impreciseClicks > 0) parts.push(`${summary.impreciseClicks} miss-clicks`);
      if (summary.technicalComfort === "low") parts.push("low typing comfort");
      if (summary.pointerComfort === "low") parts.push("low pointer comfort");
    }
    if (funnel.abandonedAtStep === step) parts.push("left page here");
    evidence.push(parts.join(" · "));
  }

  return evidence;
}
