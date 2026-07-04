"use client";

import { Check } from "lucide-react";
import type { QuizStepId } from "@/lib/quiz-flow";

type Props = {
  step: QuizStepId;
  title: string;
  message: string;
  visible: boolean;
};

export default function QuizStepReward({ step, title, message, visible }: Props) {
  if (!visible) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-16 z-20 flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <div className="quiz-reward-overlay flex max-w-sm items-center gap-3 rounded-2xl border border-primary/35 bg-card/95 px-5 py-3.5 shadow-xl shadow-primary/15 backdrop-blur-md">
        <span className="quiz-reward-check flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-5" strokeWidth={2.5} aria-hidden />
        </span>
        <div className="min-w-0 text-left">
          <p className="text-sm font-semibold text-primary">{title}</p>
          <p className="text-sm leading-snug text-foreground">{message}</p>
        </div>
        <span className="sr-only">Step {step} completed</span>
      </div>
    </div>
  );
}
