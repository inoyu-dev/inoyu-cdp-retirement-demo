import { Check } from "lucide-react";
import type { QuizStepId } from "@/lib/quiz-flow";
import { cn } from "@/lib/utils";

export type QuizProgressStep = {
  title: string;
  hint: string;
  moduleId: QuizStepId;
};

type Props = {
  wizardStep: number;
  orderedSteps: QuizProgressStep[];
};

export default function QuizProgress({ wizardStep, orderedSteps }: Props) {
  const progressPercent = Math.round(((wizardStep - 1) / Math.max(1, orderedSteps.length - 1)) * 100);

  return (
    <nav aria-label="Quiz progress" className="mb-6 space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>Progress</span>
          <span className="tabular-nums text-primary">{progressPercent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted/80">
          <div
            className="quiz-progress-bar h-full rounded-full"
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      <ol className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0">
        {orderedSteps.map((step, index) => {
          const position = index + 1;
          const done = position < wizardStep;
          const active = position === wizardStep;
          return (
            <li
              key={`${step.moduleId}-${index}`}
              className="flex min-w-0 flex-1 items-center gap-2 sm:flex-col sm:items-center sm:gap-2"
            >
              <div className="flex w-full items-center gap-2 sm:flex-col sm:items-center">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-500",
                    done && "scale-100 border-primary bg-primary text-primary-foreground",
                    active && !done && "quiz-step-active-ring scale-110 border-primary bg-primary/10 text-primary",
                    !done && !active && "border-border bg-muted/40 text-muted-foreground",
                  )}
                  aria-current={active ? "step" : undefined}
                >
                  {done ? <Check className="size-4" aria-hidden /> : position}
                </span>
                <div className="min-w-0 flex-1 sm:text-center">
                  <p
                    className={cn(
                      "text-sm font-medium leading-snug transition-colors duration-300",
                      active ? "text-foreground" : done ? "text-primary/80" : "text-muted-foreground",
                    )}
                  >
                    {step.title}
                  </p>
                  <span className="sr-only">{step.hint}</span>
                </div>
              </div>
              {index < orderedSteps.length - 1 && (
                <div
                  className={cn(
                    "ml-4 hidden h-0.5 flex-1 transition-all duration-700 sm:ml-0 sm:mt-0 sm:block sm:w-full sm:flex-none",
                    position < wizardStep ? "bg-primary" : "bg-border",
                  )}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
