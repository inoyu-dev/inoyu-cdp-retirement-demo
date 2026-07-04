import {
  computeEngagementScore,
  type ActivityAccumulator,
  type TypingAccumulator,
} from "./quiz-engagement";
import type { QuizStepId } from "./quiz-flow";

export type StepWillingness = "eager" | "steady" | "hesitant" | "stalled";

export interface FieldTiming {
  focusCount: number;
  editMs: number;
  lastFocusedAt: number | null;
}

export interface StepWillingnessSnapshot {
  step: QuizStepId;
  stepSeconds: number;
  idleSeconds: number;
  idleRatio: number;
  focusChanges: number;
  avgTypingIntervalMs: number | null;
  backspaceRate: number;
  fieldsTouched: number;
  charsTyped: number;
  engagementScore: number;
  willingness: StepWillingness;
  fieldTimings: Record<string, FieldTiming>;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function createFieldTimingsMap(): Record<string, FieldTiming> {
  return {};
}

export function recordFieldFocus(
  map: Record<string, FieldTiming>,
  fieldId: string,
  now = Date.now(),
): void {
  const existing = map[fieldId] ?? { focusCount: 0, editMs: 0, lastFocusedAt: null };
  existing.focusCount += 1;
  existing.lastFocusedAt = now;
  map[fieldId] = existing;
}

export function recordFieldBlur(
  map: Record<string, FieldTiming>,
  fieldId: string,
  now = Date.now(),
): void {
  const existing = map[fieldId];
  if (!existing?.lastFocusedAt) return;
  existing.editMs += Math.max(0, now - existing.lastFocusedAt);
  existing.lastFocusedAt = null;
  map[fieldId] = existing;
}

export function buildWillingnessSnapshot(
  step: QuizStepId,
  stepStartedAt: number,
  msSinceLastActivity: number,
  activity: ActivityAccumulator,
  typing: TypingAccumulator,
  fieldTimings: Record<string, FieldTiming>,
): StepWillingnessSnapshot {
  const stepMs = Math.max(0, Date.now() - stepStartedAt);
  const stepSeconds = Math.max(1, Math.round(stepMs / 1000));
  const idleSeconds = Math.round(activity.idleMs / 1000);
  const idleRatio = idleSeconds / stepSeconds;
  const intervals = typing.intervalSamplesMs.filter((ms) => ms >= 40 && ms <= 5000);
  const avgTypingIntervalMs = average(intervals);
  const backspaceRate =
    typing.printableChars > 0 ? typing.backspaces / typing.printableChars : 0;
  const fieldsTouched = Object.keys(fieldTimings).length;
  const engagementScore = computeEngagementScore(activity, stepSeconds, typing);

  let willingness: StepWillingness = "steady";

  if (msSinceLastActivity >= 8000 && stepSeconds >= 12) {
    willingness = "stalled";
  } else if (
    avgTypingIntervalMs !== null &&
    avgTypingIntervalMs >= 600 &&
    stepSeconds >= 10
  ) {
    willingness = "hesitant";
  } else if (backspaceRate >= 0.3 && typing.printableChars >= 4) {
    willingness = "hesitant";
  } else if (activity.focusChanges >= 6 && stepSeconds >= 15) {
    willingness = "hesitant";
  } else if (
    stepSeconds >= 40 &&
    typing.printableChars < 6 &&
    fieldsTouched <= 1
  ) {
    willingness = "hesitant";
  } else if (
    stepSeconds <= 25 &&
    engagementScore >= 65 &&
    idleRatio <= 0.25 &&
    (avgTypingIntervalMs === null || avgTypingIntervalMs <= 350)
  ) {
    willingness = "eager";
  }

  return {
    step,
    stepSeconds,
    idleSeconds,
    idleRatio: Math.round(idleRatio * 100) / 100,
    focusChanges: activity.focusChanges,
    avgTypingIntervalMs: avgTypingIntervalMs !== null ? Math.round(avgTypingIntervalMs) : null,
    backspaceRate: Math.round(backspaceRate * 100) / 100,
    fieldsTouched,
    charsTyped: typing.printableChars,
    engagementScore,
    willingness,
    fieldTimings,
  };
}

export function willingnessLabel(willingness: StepWillingness): string {
  switch (willingness) {
    case "eager":
      return "moving quickly";
    case "steady":
      return "steady pace";
    case "hesitant":
      return "taking their time";
    case "stalled":
      return "paused on this step";
    default: {
      const _exhaustive: never = willingness;
      return _exhaustive;
    }
  }
}
