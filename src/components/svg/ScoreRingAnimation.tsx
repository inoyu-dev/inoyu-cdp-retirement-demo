"use client";

type Props = {
  score: number;
  size?: number;
};

export default function ScoreRingAnimation({ score, size = 160 }: Props) {
  const clamped = Math.min(100, Math.max(0, score));
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      className="quiz-score-ring mx-auto block"
      aria-hidden
    >
      <defs>
        <linearGradient id="score-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="oklch(0.55 0.14 255)" />
          <stop offset="50%" stopColor="oklch(0.62 0.12 180)" />
          <stop offset="100%" stopColor="oklch(0.72 0.14 85)" />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="oklch(0.91 0.012 255)"
        strokeWidth={stroke}
      />
      <circle
        className="quiz-score-ring-progress"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#score-ring-gradient)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
