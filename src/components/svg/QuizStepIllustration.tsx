"use client";

import type { QuizStepId } from "@/lib/quiz-flow";

type Props = {
  moduleId: QuizStepId;
};

export default function QuizStepIllustration({ moduleId }: Props) {
  return (
    <svg
      viewBox="0 0 120 80"
      className="quiz-step-illustration mb-4 h-16 w-full max-w-[140px]"
      aria-hidden
    >
      {moduleId === 1 && (
        <g className="quiz-illustration-draw">
          <circle cx="40" cy="28" r="12" fill="none" stroke="oklch(0.55 0.14 255)" strokeWidth="2.5" />
          <path d="M22 58 Q40 42 58 58" fill="none" stroke="oklch(0.55 0.14 255)" strokeWidth="2.5" strokeLinecap="round" />
          <rect x="72" y="20" width="36" height="8" rx="4" fill="oklch(0.62 0.12 180 / 0.5)" className="quiz-illustration-bar" />
          <rect x="72" y="36" width="28" height="8" rx="4" fill="oklch(0.72 0.14 85 / 0.5)" className="quiz-illustration-bar" style={{ animationDelay: "0.15s" }} />
        </g>
      )}
      {moduleId === 2 && (
        <g className="quiz-illustration-draw">
          <path
            d="M60 50 C60 50 45 38 45 28 C45 20 52 16 60 22 C68 16 75 20 75 28 C75 38 60 50 60 50"
            fill="oklch(0.62 0.12 180 / 0.25)"
            stroke="oklch(0.62 0.12 180)"
            strokeWidth="2"
          />
          <path d="M30 58 L90 58" stroke="oklch(0.55 0.14 255 / 0.4)" strokeWidth="2" strokeDasharray="4 4" className="quiz-illustration-dash" />
        </g>
      )}
      {moduleId === 3 && (
        <g className="quiz-illustration-draw">
          <rect x="25" y="18" width="70" height="44" rx="8" fill="none" stroke="oklch(0.72 0.14 85)" strokeWidth="2" />
          <path d="M35 32 H85 M35 42 H70 M35 52 H55" stroke="oklch(0.72 0.14 85 / 0.7)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="88" cy="24" r="6" fill="oklch(0.55 0.14 255)" className="quiz-ambient-pulse" />
        </g>
      )}
      {moduleId === 4 && (
        <g className="quiz-illustration-draw">
          <circle cx="60" cy="40" r="26" fill="none" stroke="oklch(0.55 0.14 255)" strokeWidth="2.5" className="quiz-score-ring-progress" style={{ strokeDasharray: 163, strokeDashoffset: 40 }} />
          <text x="60" y="46" textAnchor="middle" className="fill-primary text-[18px] font-semibold" style={{ fontSize: 18 }}>
            ★
          </text>
        </g>
      )}
    </svg>
  );
}
