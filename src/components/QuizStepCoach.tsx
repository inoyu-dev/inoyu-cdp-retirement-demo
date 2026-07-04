"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock3, Lightbulb, Shield, Sparkles } from "lucide-react";
import { useQuizLocale } from "@/components/QuizLocaleProvider";
import { Card, CardContent } from "@/components/ui/card";
import type { QuizCopy } from "@/lib/i18n/types";
import type { QuizStepId } from "@/lib/quiz-flow";
import type { StepWillingnessSnapshot } from "@/lib/step-willingness";
import type { QuizPartialAnswers, StepPersonalization } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  profileId: string | null;
  step: QuizStepId;
  partialAnswers: QuizPartialAnswers;
  willingness: StepWillingnessSnapshot;
  className?: string;
};

type RotationItem = {
  text: string;
  kind: "tip" | "trust" | "personal";
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

function buildRotationItems(
  step: QuizStepId,
  copy: QuizCopy,
  personalization: StepPersonalization | null,
): RotationItem[] {
  const items: RotationItem[] = [
    ...tipsForStep(step, copy.didYouKnow).map((text) => ({ text, kind: "tip" as const })),
    ...copy.hero.trust.map((text) => ({ text, kind: "trust" as const })),
  ];
  if (personalization?.nudge) {
    items.push({ text: personalization.nudge, kind: "personal" });
  }
  return items;
}

export default function QuizStepCoach({
  profileId,
  step,
  partialAnswers,
  willingness,
  className,
}: Props) {
  const { copy } = useQuizLocale();
  const [personalization, setPersonalization] = useState<StepPersonalization | null>(null);
  const [loading, setLoading] = useState(false);
  const lastFetchKey = useRef("");
  const [tipIndex, setTipIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const rotationItems = useMemo(
    () => buildRotationItems(step, copy, personalization),
    [step, copy, personalization],
  );

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

  useEffect(() => {
    if (!profileId) return;

    const fetchKey = [
      step,
      willingness.willingness,
      willingness.stepSeconds,
      willingness.engagementScore,
      partialAnswers.firstName,
      partialAnswers.primaryConcern,
    ].join(":");

    if (fetchKey === lastFetchKey.current) return;

    const debounce = window.setTimeout(() => {
      lastFetchKey.current = fetchKey;
      setLoading(true);
      void (async () => {
        try {
          const res = await fetch("/api/step-personalization", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              profileId,
              step,
              partial: partialAnswers,
              snapshot: willingness,
            }),
          });
          if (!res.ok) return;
          const data = (await res.json()) as { personalization: StepPersonalization };
          setPersonalization(data.personalization);
        } finally {
          setLoading(false);
        }
      })();
    }, willingness.willingness === "stalled" ? 800 : 1800);

    return () => window.clearTimeout(debounce);
  }, [profileId, step, partialAnswers, willingness]);

  const toneClass =
    current?.kind === "personal"
      ? personalization?.tone === "celebrate"
        ? "border-emerald-500/30 bg-emerald-500/5"
        : personalization?.tone === "reassure"
          ? "border-sky-500/30 bg-sky-500/5"
          : "border-primary/25 bg-primary/5"
      : "border-border/70 bg-muted/20";

  const trustIndex =
    current?.kind === "trust" ? copy.hero.trust.indexOf(current.text) : -1;
  const Icon =
    current?.kind === "personal"
      ? Sparkles
      : current?.kind === "trust" && trustIndex >= 0
        ? TRUST_ICONS[trustIndex]
        : Lightbulb;

  const iconClass =
    current?.kind === "personal"
      ? "text-primary"
      : current?.kind === "trust"
        ? "text-primary"
        : "text-amber-500";

  return (
    <Card className={cn("transition-colors", toneClass, className)}>
      <CardContent className="flex gap-3 pt-4 pb-4">
        <Icon className={cn("mt-0.5 size-5 shrink-0", iconClass)} aria-hidden />
        <div className="min-h-[3.25rem] space-y-1">
          <p className="text-sm font-medium">{copy.didYouKnow.label}</p>
          <p
            className={cn(
              "text-sm leading-relaxed transition-opacity duration-300",
              current?.kind === "personal" ? "text-foreground" : "text-muted-foreground",
              visible ? "opacity-100" : "opacity-0",
            )}
          >
            {loading && !personalization && !current?.text
              ? copy.stepCoach.loading
              : current?.text}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
