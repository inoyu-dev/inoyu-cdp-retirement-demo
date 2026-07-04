import type {
  QuizExperiment,
  QuizExperimentStats,
  QuizVariantConfig,
  VisitorProfile,
} from "./types";
import type { QuizStepId } from "./quiz-flow";

export const CONTROL_VARIANT_ID = "control" as const;

export const DEFAULT_STEP_ORDER: [QuizStepId, QuizStepId, QuizStepId, QuizStepId] = [
  1, 2, 3, 4,
];

export const CONTROL_VARIANT: QuizVariantConfig = {
  id: CONTROL_VARIANT_ID,
  name: "Control",
  description: "Default quiz flow: About you → Concerns → Contact → Score",
  stepOrder: DEFAULT_STEP_ORDER,
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const MODULE_LABELS: Record<QuizStepId, string> = {
  1: "About you",
  2: "Concerns",
  3: "Contact",
  4: "Score",
};

export function formatStepOrder(
  order: [QuizStepId, QuizStepId, QuizStepId, QuizStepId],
): string {
  return order.map((id) => MODULE_LABELS[id]).join(" → ");
}

export function isValidStepOrder(
  order: number[],
): order is [QuizStepId, QuizStepId, QuizStepId, QuizStepId] {
  if (order.length !== 4) return false;
  const sorted = [...order].sort((a, b) => a - b);
  return sorted[0] === 1 && sorted[1] === 2 && sorted[2] === 3 && sorted[3] === 4;
}

function hashSession(sessionId: string): number {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i += 1) {
    hash = (hash * 31 + sessionId.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function pickVariantId(
  sessionId: string,
  experiment: QuizExperiment | null,
): string {
  if (!experiment) return CONTROL_VARIANT_ID;
  const bucket = hashSession(sessionId) % 100;
  return bucket < experiment.trafficSplit * 100
    ? experiment.testVariantId
    : CONTROL_VARIANT_ID;
}

export function resolveVariant(
  variantId: string | undefined,
  variants: Record<string, QuizVariantConfig>,
): QuizVariantConfig {
  if (!variantId || variantId === CONTROL_VARIANT_ID) return CONTROL_VARIANT;
  return variants[variantId] ?? CONTROL_VARIANT;
}

export function computeExperimentStats(
  profiles: VisitorProfile[],
  experiment: QuizExperiment | null,
): QuizExperimentStats | null {
  if (!experiment) return null;

  const controlProfiles = profiles.filter(
    (p) => !p.quizVariantId || p.quizVariantId === CONTROL_VARIANT_ID,
  );
  const testProfiles = profiles.filter(
    (p) => p.quizVariantId === experiment.testVariantId,
  );

  const summarize = (list: VisitorProfile[]) => {
    const visitors = list.length;
    const completed = list.filter((p) => p.quiz?.completedAt).length;
    return {
      visitors,
      completed,
      completionRate: visitors > 0 ? Math.round((completed / visitors) * 1000) / 10 : 0,
    };
  };

  return {
    control: summarize(controlProfiles),
    test: summarize(testProfiles),
  };
}
