"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import VisitorNextSteps from "@/components/VisitorNextSteps";
import ScoreRingAnimation from "@/components/svg/ScoreRingAnimation";
import type { QuizCopy } from "@/lib/i18n";
import { format } from "@/lib/i18n";
import type { QuizAnswers } from "@/lib/types";

type Props = {
  copy: QuizCopy;
  quiz: Partial<QuizAnswers> & { score?: number };
  firstName?: string;
  visitorNextSteps?: string[];
  loadingNextSteps?: boolean;
  empatheticResponse?: string;
  loadingEmpathetic?: boolean;
};

export default function ScoreReveal({
  copy,
  quiz,
  firstName,
  visitorNextSteps,
  loadingNextSteps,
  empatheticResponse,
  loadingEmpathetic,
}: Props) {
  const name = firstName ?? quiz.firstName ?? "there";
  const score = quiz.score;
  const [displayScore, setDisplayScore] = useState<number | null>(null);
  const retireAge =
    quiz.age !== undefined && quiz.retireYears !== undefined
      ? quiz.age + quiz.retireYears
      : null;

  useEffect(() => {
    if (score === null || score === undefined) {
      setDisplayScore(null);
      return;
    }

    setDisplayScore(0);
    const durationMs = 900;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      setDisplayScore(Math.round(score * eased));
      if (t < 1) requestAnimationFrame(tick);
    };

    const frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  return (
    <div className="quiz-step-enter space-y-4">
      <div className="space-y-2 text-center">
        <Badge variant="secondary" className="rounded-full px-3 py-1 text-base">
          <Sparkles className="mr-1.5 size-4" aria-hidden />
          {copy.score.badge}
        </Badge>
        <h2 className="text-2xl font-semibold sm:text-3xl">{format(copy.score.title, { name })}</h2>
        {loadingEmpathetic ? (
          <p className="text-base leading-relaxed text-muted-foreground">{copy.score.personalizing}</p>
        ) : empatheticResponse ? (
          <p className="mx-auto max-w-lg text-base leading-relaxed text-muted-foreground">{empatheticResponse}</p>
        ) : (
          <p className="text-base leading-relaxed text-muted-foreground">{copy.score.fallback}</p>
        )}
      </div>

      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="h-1.5 bg-gradient-to-r from-primary via-chart-2 to-chart-3" />
        <CardHeader className="text-center">
          <CardDescription className="text-base">{copy.score.readiness}</CardDescription>
          <div className="relative mx-auto h-[140px] w-[140px]">
            {displayScore !== null && score !== null && score !== undefined ? (
              <ScoreRingAnimation score={displayScore} size={140} />
            ) : null}
            <CardTitle className="quiz-score-pop absolute inset-0 flex items-center justify-center text-5xl font-semibold tabular-nums sm:text-6xl">
            {displayScore !== null ? (
              <>
                {displayScore}
                <span className="text-2xl font-normal text-muted-foreground"> / 100</span>
              </>
            ) : (
              "—"
            )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pb-8 text-base">
          {displayScore !== null && score !== null && score !== undefined && (
            <div
              className="h-3 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={score}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={format(copy.score.progressAria, { score: String(score) })}
            >
              <div
                className="quiz-progress-bar h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${displayScore}%` }}
              />
            </div>
          )}
          <ul className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4">
            {quiz.age !== undefined && (
              <li>
                <span className="font-medium">{copy.score.age}</span> {quiz.age}
              </li>
            )}
            {retireAge !== null && (
              <li>
                <span className="font-medium">{copy.score.targetRetire}</span> {retireAge}
              </li>
            )}
            {quiz.primaryConcern && (
              <li>
                <span className="font-medium">{copy.score.topConcern}</span>{" "}
                {copy.concerns[quiz.primaryConcern]}
              </li>
            )}
            {quiz.currentSavings && (
              <li>
                <span className="font-medium">{copy.score.savingsBand}</span>{" "}
                {copy.savings[quiz.currentSavings]}
              </li>
            )}
          </ul>
          <p className="leading-relaxed text-muted-foreground">
            {score !== null && score !== undefined && score < 65
              ? copy.score.lowScore
              : copy.score.highScore}
          </p>
        </CardContent>
      </Card>

      {(loadingNextSteps || (visitorNextSteps && visitorNextSteps.length > 0)) && (
        <VisitorNextSteps
          steps={visitorNextSteps ?? []}
          loading={loadingNextSteps}
          title={copy.nextSteps.title}
          description={copy.nextSteps.description}
          loadingLabel={copy.nextSteps.loading}
          compact
        />
      )}
    </div>
  );
}
