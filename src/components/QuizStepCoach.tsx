"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Lightbulb, Shield } from "lucide-react";
import { useQuizLocale } from "@/components/QuizLocaleProvider";
import { Card, CardContent } from "@/components/ui/card";
import type { QuizCopy } from "@/lib/i18n/types";
import type { QuizStepId } from "@/lib/quiz-flow";
import { cn } from "@/lib/utils";

type Props = {
  step: QuizStepId;
  className?: string;
};

type RotationItem = {
  text: string;
  kind: "tip" | "trust";
};

const TRUST_ICONS = [Clock3, Shield, CheckCircle2] as const;

function tipsForStep(step: QuizStepId, didYouKnow: QuizCopy["didYouKnow"]): string[] {
  switch (step) {
    case 1:
      return didYouKnow.step1;
    case 2:
      return didYouKnow.step2;
    case 3:
      return didYouKnow.step3;
    case 4:
      return didYouKnow.step4;
    default: {
      const _exhaustive: never = step;
      return _exhaustive;
    }
  }
}

function buildRotationItems(step: QuizStepId, copy: QuizCopy): RotationItem[] {
  return [
    ...tipsForStep(step, copy.didYouKnow).map((text) => ({ text, kind: "tip" as const })),
    ...copy.hero.trust.map((text) => ({ text, kind: "trust" as const })),
  ];
}

export default function QuizStepCoach({ step, className }: Props) {
  const { copy } = useQuizLocale();
  const [tipIndex, setTipIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const rotationItems = useMemo(() => buildRotationItems(step, copy), [step, copy]);
  const current = rotationItems[tipIndex] ?? rotationItems[0];

  useEffect(() => {
    setTipIndex(0);
  }, [step]);

  useEffect(() => {
    if (rotationItems.length <= 1) return;
    const id = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setTipIndex((currentIndex) => (currentIndex + 1) % rotationItems.length);
        setVisible(true);
      }, 220);
    }, 9000);
    return () => window.clearInterval(id);
  }, [rotationItems.length, step]);

  useEffect(() => {
    if (tipIndex >= rotationItems.length) {
      setTipIndex(0);
    }
  }, [rotationItems.length, tipIndex]);

  const trustIndex =
    current?.kind === "trust" ? copy.hero.trust.indexOf(current.text) : -1;
  const Icon =
    current?.kind === "trust" && trustIndex >= 0 ? TRUST_ICONS[trustIndex] : Lightbulb;

  const iconClass = current?.kind === "trust" ? "text-primary" : "text-amber-500";

  return (
    <Card className={cn("border-border/70 bg-muted/20 transition-colors", className)}>
      <CardContent className="flex gap-3 pt-4 pb-4">
        <Icon className={cn("mt-0.5 size-5 shrink-0", iconClass)} aria-hidden />
        <div className="min-h-[3.25rem] flex-1 space-y-1">
          <p className="text-sm font-medium">{copy.didYouKnow.label}</p>
          <p
            className={cn(
              "text-sm leading-relaxed text-muted-foreground transition-opacity duration-300",
              visible ? "opacity-100" : "opacity-0",
            )}
          >
            {current?.text}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
