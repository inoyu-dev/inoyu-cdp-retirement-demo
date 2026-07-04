import type { QuizStepId } from "./quiz-flow";

export type TechnicalComfort = "high" | "moderate" | "low" | "unknown";
export type StepExitReason = "forward" | "back" | "submit" | "leave";

export interface TypingAccumulator {
  keystrokes: number;
  printableChars: number;
  backspaces: number;
  deleteKeys: number;
  pasteEvents: number;
  intervalSamplesMs: number[];
  fieldIds: string[];
  lastKeystrokeAt: number | null;
  lastFieldId: string | null;
}

export interface PointerMetrics {
  impreciseClicks: number;
  correctiveMovements: number;
  missedTargetRetries: number;
  movementSamples: number;
  /** Successful clicks on buttons, inputs, labels, etc. */
  preciseClicks: number;
}

export interface ActivityAccumulator {
  mouseMovements: number;
  mouseClicks: number;
  scrollEvents: number;
  focusChanges: number;
  keydownsOutsideInput: number;
  activeMs: number;
  idleMs: number;
  pointer: PointerMetrics;
}

export interface StepEngagementPayload {
  step: QuizStepId;
  durationSeconds: number;
  activeSeconds: number;
  idleSeconds: number;
  mouseMovements: number;
  mouseClicks: number;
  scrollEvents: number;
  focusChanges: number;
  keydownsOutsideInput: number;
  typing: {
    keystrokes: number;
    printableChars: number;
    backspaces: number;
    pasteEvents: number;
    avgIntervalMs: number | null;
    charsPerMinute: number | null;
    fieldsTypedIn: string[];
  };
  pointer: PointerMetrics & {
    impreciseClickRate: number | null;
    correctionRate: number | null;
  };
  /** Keyboard / typing comfort. */
  technicalComfort: TechnicalComfort;
  /** Mouse or trackpad precision comfort. */
  pointerComfort: TechnicalComfort;
  exitedVia: StepExitReason;
  engagementScore: number;
}

export interface StepEngagementSummary {
  step: QuizStepId;
  durationSeconds: number;
  activeSeconds: number;
  idleSeconds: number;
  technicalComfort: TechnicalComfort;
  engagementScore: number;
  avgTypingIntervalMs: number | null;
  charsPerMinute: number | null;
  mouseMovements: number;
  pointerComfort: TechnicalComfort;
  impreciseClicks: number;
  correctiveMovements: number;
}

export interface QuizEngagementRollup {
  stepSummaries: StepEngagementSummary[];
  overallTechnicalComfort: TechnicalComfort;
  overallPointerComfort: TechnicalComfort;
  totalDurationSeconds: number;
  totalActiveSeconds: number;
  avgTypingIntervalMs: number | null;
  avgEngagementScore: number;
}

export function createTypingAccumulator(): TypingAccumulator {
  return {
    keystrokes: 0,
    printableChars: 0,
    backspaces: 0,
    deleteKeys: 0,
    pasteEvents: 0,
    intervalSamplesMs: [],
    fieldIds: [],
    lastKeystrokeAt: null,
    lastFieldId: null,
  };
}

export function createPointerMetrics(): PointerMetrics {
  return {
    impreciseClicks: 0,
    correctiveMovements: 0,
    missedTargetRetries: 0,
    movementSamples: 0,
    preciseClicks: 0,
  };
}

export function createActivityAccumulator(): ActivityAccumulator {
  return {
    mouseMovements: 0,
    mouseClicks: 0,
    scrollEvents: 0,
    focusChanges: 0,
    keydownsOutsideInput: 0,
    activeMs: 0,
    idleMs: 0,
    pointer: createPointerMetrics(),
  };
}

const INTERACTIVE_SELECTOR =
  'button, a, input, textarea, select, label, summary, [role="button"], [role="radio"], [role="checkbox"], [role="option"], [data-slot="radio-group-item"], [data-slot="select-trigger"], [data-slot="accordion-trigger"]';

export function isInteractiveClickTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return target.closest(INTERACTIVE_SELECTOR) !== null;
}

export interface PointerTrackState {
  lastPoint: { x: number; y: number; at: number } | null;
  prevVector: { dx: number; dy: number; at: number } | null;
  lastMissClick: { x: number; y: number; at: number } | null;
}

export function createPointerTrackState(): PointerTrackState {
  return { lastPoint: null, prevVector: null, lastMissClick: null };
}

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function recordPointerMove(
  activity: ActivityAccumulator,
  state: PointerTrackState,
  x: number,
  y: number,
  now: number,
): void {
  activity.pointer.movementSamples += 1;

  if (state.lastPoint) {
    const dx = x - state.lastPoint.x;
    const dy = y - state.lastPoint.y;
    const mag = Math.hypot(dx, dy);
    if (mag >= 6 && state.prevVector) {
      const prev = state.prevVector;
      const prevMag = Math.hypot(prev.dx, prev.dy);
      if (prevMag >= 6) {
        const dot = prev.dx * dx + prev.dy * dy;
        const cos = dot / (prevMag * mag);
        if (cos < -0.25 && now - prev.at <= 400) {
          activity.pointer.correctiveMovements += 1;
        }
      }
    }
    if (mag >= 6) {
      state.prevVector = { dx, dy, at: now };
    }
  }

  state.lastPoint = { x, y, at: now };
}

export function recordPointerClick(
  activity: ActivityAccumulator,
  state: PointerTrackState,
  target: EventTarget | null,
  x: number,
  y: number,
  now: number,
): void {
  if (isInteractiveClickTarget(target)) {
    activity.pointer.preciseClicks += 1;
    if (state.lastMissClick) {
      const elapsed = now - state.lastMissClick.at;
      const dist = distance(x, y, state.lastMissClick.x, state.lastMissClick.y);
      if (elapsed <= 900 && dist <= 100) {
        activity.pointer.missedTargetRetries += 1;
      }
      state.lastMissClick = null;
    }
    return;
  }

  activity.pointer.impreciseClicks += 1;
  state.lastMissClick = { x, y, at: now };
}

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function fieldIdForElement(el: HTMLInputElement | HTMLTextAreaElement): string {
  return el.id || el.name || el.type || "field";
}

export function recordTypingKeystroke(
  acc: TypingAccumulator,
  event: KeyboardEvent,
  target: HTMLInputElement | HTMLTextAreaElement,
): void {
  const now = Date.now();
  const fieldId = fieldIdForElement(target);

  acc.keystrokes += 1;
  if (!acc.fieldIds.includes(fieldId)) {
    acc.fieldIds.push(fieldId);
  }

  if (event.key === "Backspace") {
    acc.backspaces += 1;
  } else if (event.key === "Delete") {
    acc.deleteKeys += 1;
  } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
    acc.printableChars += 1;
    if (acc.lastKeystrokeAt !== null && acc.lastFieldId === fieldId) {
      const delta = now - acc.lastKeystrokeAt;
      if (delta >= 40 && delta <= 8000) {
        acc.intervalSamplesMs.push(delta);
      }
    }
  }

  acc.lastKeystrokeAt = now;
  acc.lastFieldId = fieldId;
}

export function recordTypingPaste(acc: TypingAccumulator, target: HTMLInputElement | HTMLTextAreaElement): void {
  acc.pasteEvents += 1;
  const fieldId = fieldIdForElement(target);
  if (!acc.fieldIds.includes(fieldId)) {
    acc.fieldIds.push(fieldId);
  }
}

export function inferTechnicalComfort(
  typing: TypingAccumulator,
  durationSeconds: number,
): TechnicalComfort {
  if (typing.printableChars < 3) return "unknown";

  const intervals = typing.intervalSamplesMs.filter((ms) => ms >= 40 && ms <= 5000);
  const avgInterval = average(intervals);
  if (avgInterval === null) return "unknown";

  const backspaceRate = typing.backspaces / Math.max(typing.printableChars, 1);
  const charsPerMinute =
    durationSeconds > 0 ? typing.printableChars / (durationSeconds / 60) : null;

  if (typing.pasteEvents > 0 && typing.printableChars >= 8) {
    return "moderate";
  }

  if (avgInterval <= 280 && backspaceRate <= 0.12 && (charsPerMinute ?? 0) >= 35) {
    return "high";
  }
  if (avgInterval >= 650 || backspaceRate >= 0.35 || (charsPerMinute ?? 999) <= 12) {
    return "low";
  }
  return "moderate";
}

export function inferPointerComfort(
  pointer: PointerMetrics,
  mouseMovements: number,
  mouseClicks: number,
): TechnicalComfort {
  const totalClicks = Math.max(mouseClicks, 1);
  const samples = Math.max(pointer.movementSamples, 1);

  if (mouseMovements < 3 && mouseClicks < 2) return "unknown";

  const impreciseRate = pointer.impreciseClicks / totalClicks;
  const correctionRate = pointer.correctiveMovements / samples;
  const retryRate = pointer.missedTargetRetries / totalClicks;

  if (impreciseRate <= 0.12 && correctionRate <= 0.1 && retryRate <= 0.08) {
    return "high";
  }
  if (impreciseRate >= 0.32 || correctionRate >= 0.22 || retryRate >= 0.2) {
    return "low";
  }
  return "moderate";
}

export function computeEngagementScore(
  activity: ActivityAccumulator,
  durationSeconds: number,
  typing: TypingAccumulator,
): number {
  if (durationSeconds <= 0) return 0;

  const activeRatio = activity.activeMs / Math.max(durationSeconds * 1000, 1);
  const interactionDensity =
    (activity.mouseMovements + activity.mouseClicks * 2 + activity.scrollEvents * 2) /
    durationSeconds;
  const typingBonus = Math.min(typing.printableChars / 20, 1) * 15;

  const score = activeRatio * 45 + Math.min(interactionDensity / 8, 1) * 40 + typingBonus;
  return Math.round(Math.max(0, Math.min(100, score)));
}

export function buildStepEngagementPayload(
  step: QuizStepId,
  durationMs: number,
  activity: ActivityAccumulator,
  typing: TypingAccumulator,
  exitedVia: StepExitReason,
): StepEngagementPayload {
  const durationSeconds = Math.max(1, Math.round(durationMs / 1000));
  const activeSeconds = Math.round(activity.activeMs / 1000);
  const idleSeconds = Math.round(activity.idleMs / 1000);
  const avgIntervalMs = average(typing.intervalSamplesMs);
  const charsPerMinute =
    durationSeconds > 0 ? Math.round((typing.printableChars / durationSeconds) * 60) : null;

  const impreciseClickRate =
    activity.mouseClicks > 0
      ? Math.round((activity.pointer.impreciseClicks / activity.mouseClicks) * 100) / 100
      : null;
  const correctionRate =
    activity.pointer.movementSamples > 0
      ? Math.round((activity.pointer.correctiveMovements / activity.pointer.movementSamples) * 100) / 100
      : null;

  return {
    step,
    durationSeconds,
    activeSeconds,
    idleSeconds,
    mouseMovements: activity.mouseMovements,
    mouseClicks: activity.mouseClicks,
    scrollEvents: activity.scrollEvents,
    focusChanges: activity.focusChanges,
    keydownsOutsideInput: activity.keydownsOutsideInput,
    typing: {
      keystrokes: typing.keystrokes,
      printableChars: typing.printableChars,
      backspaces: typing.backspaces,
      pasteEvents: typing.pasteEvents,
      avgIntervalMs: avgIntervalMs !== null ? Math.round(avgIntervalMs) : null,
      charsPerMinute,
      fieldsTypedIn: [...typing.fieldIds],
    },
    pointer: {
      ...activity.pointer,
      impreciseClickRate,
      correctionRate,
    },
    technicalComfort: inferTechnicalComfort(typing, durationSeconds),
    pointerComfort: inferPointerComfort(
      activity.pointer,
      activity.mouseMovements,
      activity.mouseClicks,
    ),
    exitedVia,
    engagementScore: computeEngagementScore(activity, durationSeconds, typing),
  };
}



export function payloadToSummary(payload: StepEngagementPayload): StepEngagementSummary {
  return {
    step: payload.step,
    durationSeconds: payload.durationSeconds,
    activeSeconds: payload.activeSeconds,
    idleSeconds: payload.idleSeconds,
    technicalComfort: payload.technicalComfort,
    engagementScore: payload.engagementScore,
    avgTypingIntervalMs: payload.typing.avgIntervalMs,
    charsPerMinute: payload.typing.charsPerMinute,
    mouseMovements: payload.mouseMovements,
    pointerComfort: payload.pointerComfort,
    impreciseClicks: payload.pointer.impreciseClicks,
    correctiveMovements: payload.pointer.correctiveMovements,
  };
}

const COMFORT_RANK: Record<TechnicalComfort, number> = {
  unknown: 0,
  low: 1,
  moderate: 2,
  high: 3,
};

export function mergeTechnicalComfort(
  current: TechnicalComfort,
  next: TechnicalComfort,
): TechnicalComfort {
  return COMFORT_RANK[next] > COMFORT_RANK[current] ? next : current;
}

export function rollupQuizEngagement(
  existing: QuizEngagementRollup | undefined,
  payload: StepEngagementPayload,
): QuizEngagementRollup {
  const summary = payloadToSummary(payload);
  const stepSummaries = [
    ...(existing?.stepSummaries.filter((s) => s.step !== payload.step) ?? []),
    summary,
  ].sort((a, b) => a.step - b.step);

  const intervals = stepSummaries
    .map((s) => s.avgTypingIntervalMs)
    .filter((v): v is number => v !== null);
  const totalDurationSeconds = stepSummaries.reduce((sum, s) => sum + s.durationSeconds, 0);
  const totalActiveSeconds = stepSummaries.reduce((sum, s) => sum + s.activeSeconds, 0);

  let overallTechnicalComfort: TechnicalComfort = "unknown";
  let overallPointerComfort: TechnicalComfort = "unknown";
  for (const s of stepSummaries) {
    overallTechnicalComfort = mergeTechnicalComfort(overallTechnicalComfort, s.technicalComfort);
    overallPointerComfort = mergeTechnicalComfort(overallPointerComfort, s.pointerComfort);
  }

  return {
    stepSummaries,
    overallTechnicalComfort,
    overallPointerComfort,
    totalDurationSeconds,
    totalActiveSeconds,
    avgTypingIntervalMs: intervals.length > 0 ? Math.round(average(intervals) ?? 0) : null,
    avgEngagementScore:
      stepSummaries.length > 0
        ? Math.round(
            stepSummaries.reduce((sum, s) => sum + s.engagementScore, 0) / stepSummaries.length,
          )
        : 0,
  };
}

export function deriveEngagementSegments(rollup: QuizEngagementRollup | undefined): string[] {
  if (!rollup || rollup.stepSummaries.length === 0) return [];

  const segments: string[] = [];
  switch (rollup.overallTechnicalComfort) {
    case "high":
      segments.push("tech_comfort_high");
      break;
    case "moderate":
      segments.push("tech_comfort_moderate");
      break;
    case "low":
      segments.push("tech_comfort_low");
      break;
    case "unknown":
      break;
    default: {
      const _exhaustive: never = rollup.overallTechnicalComfort;
      return _exhaustive;
    }
  }

  switch (rollup.overallPointerComfort) {
    case "high":
      segments.push("pointer_comfort_high");
      break;
    case "moderate":
      segments.push("pointer_comfort_moderate");
      break;
    case "low":
      segments.push("pointer_comfort_low");
      break;
    case "unknown":
      break;
    default: {
      const _exhaustive: never = rollup.overallPointerComfort;
      return _exhaustive;
    }
  }

  const avgStepDuration =
    rollup.totalDurationSeconds / Math.max(rollup.stepSummaries.length, 1);
  if (avgStepDuration >= 90) segments.push("deliberate_quiz_taker");
  if (rollup.avgEngagementScore >= 65) segments.push("highly_active_visitor");
  if (rollup.totalActiveSeconds / Math.max(rollup.totalDurationSeconds, 1) < 0.35) {
    segments.push("mostly_idle_on_quiz");
  }

  return segments;
}

export function pointerComfortLabel(level: TechnicalComfort): string {
  switch (level) {
    case "high":
      return "High pointer precision";
    case "moderate":
      return "Moderate pointer precision";
    case "low":
      return "Low pointer precision (miss-clicks or corrections)";
    case "unknown":
      return "Insufficient pointer data";
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}

export function technicalComfortLabel(level: TechnicalComfort): string {
  switch (level) {
    case "high":
      return "High keyboard comfort";
    case "moderate":
      return "Moderate keyboard comfort";
    case "low":
      return "Low keyboard comfort";
    case "unknown":
      return "Insufficient typing data";
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}
