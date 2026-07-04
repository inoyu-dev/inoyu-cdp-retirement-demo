"use client";

import type { QuizStepId } from "@/lib/quiz-flow";

type Props = {
  moduleId: QuizStepId;
};

const ACCENT: Record<QuizStepId, string> = {
  1: "oklch(0.55 0.14 255)",
  2: "oklch(0.62 0.12 180)",
  3: "oklch(0.72 0.14 85)",
  4: "oklch(0.55 0.14 255)",
};

export default function QuizCardAmbient({ moduleId }: Props) {
  const accent = ACCENT[moduleId];
  return (
    <svg
      className="quiz-card-ambient pointer-events-none absolute -right-8 -top-8 size-48 opacity-40 sm:size-56"
      viewBox="0 0 200 200"
      aria-hidden
    >
      <circle
        className="quiz-ambient-ring"
        cx="100"
        cy="100"
        r="70"
        fill="none"
        stroke={accent}
        strokeWidth="1.5"
        opacity="0.5"
      />
      <circle
        className="quiz-ambient-ring quiz-ambient-ring-delay"
        cx="100"
        cy="100"
        r="50"
        fill="none"
        stroke={accent}
        strokeWidth="1"
        opacity="0.35"
      />
      <circle className="quiz-ambient-pulse" cx="100" cy="100" r="8" fill={accent} opacity="0.6" />
    </svg>
  );
}
