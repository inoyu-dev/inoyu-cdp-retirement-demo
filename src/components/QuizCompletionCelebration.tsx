"use client";

import { Sparkles, Trophy } from "lucide-react";

type Props = {
  visible: boolean;
  title: string;
  subtitle: string;
};

export default function QuizCompletionCelebration({ visible, title, subtitle }: Props) {
  if (!visible) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-2xl"
      aria-hidden
    >
      {Array.from({ length: 28 }, (_, i) => (
        <span
          key={i}
          className="quiz-confetti-piece"
          style={{
            left: `${(i * 3.7 + 5) % 95}%`,
            animationDelay: `${(i % 10) * 0.08}s`,
            transform: `rotate(${i * 24}deg)`,
          }}
        />
      ))}
      <div className="absolute inset-0 flex items-start justify-center bg-primary/5 pt-12 backdrop-blur-[2px]">
        <div className="quiz-success-burst flex flex-col items-center gap-2 rounded-3xl border border-primary/30 bg-card/95 px-10 py-8 text-center shadow-2xl ring-4 ring-primary/20">
          <span className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-primary via-chart-2 to-chart-3 text-primary-foreground shadow-lg">
            <Trophy className="size-8" aria-hidden />
          </span>
          <p className="flex items-center gap-1.5 text-2xl font-semibold tracking-tight">
            <Sparkles className="size-5 text-chart-3" aria-hidden />
            {title}
          </p>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
