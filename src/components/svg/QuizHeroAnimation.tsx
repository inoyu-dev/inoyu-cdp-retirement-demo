"use client";

/** Animated retirement-themed hero illustration — decorative only. */
export default function QuizHeroAnimation() {
  return (
    <div className="relative mx-auto w-full max-w-lg" aria-hidden>
      <svg
        viewBox="0 0 480 420"
        className="quiz-hero-svg h-auto w-full drop-shadow-sm"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="hero-sky" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.72 0.12 255 / 0.35)" />
            <stop offset="100%" stopColor="oklch(0.88 0.08 85 / 0.2)" />
          </linearGradient>
          <linearGradient id="hero-path" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="oklch(0.55 0.14 255)" />
            <stop offset="50%" stopColor="oklch(0.62 0.12 180)" />
            <stop offset="100%" stopColor="oklch(0.72 0.14 85)" />
          </linearGradient>
          <filter id="hero-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="480" height="420" rx="32" fill="url(#hero-sky)" className="opacity-80" />

        <circle className="quiz-hero-orb quiz-hero-orb-1" cx="90" cy="80" r="48" fill="oklch(0.62 0.14 255 / 0.25)" />
        <circle className="quiz-hero-orb quiz-hero-orb-2" cx="380" cy="120" r="36" fill="oklch(0.72 0.14 85 / 0.3)" />
        <circle className="quiz-hero-orb quiz-hero-orb-3" cx="320" cy="320" r="56" fill="oklch(0.62 0.12 180 / 0.2)" />

        <path
          className="quiz-hero-curve"
          d="M40 300 Q120 260 180 240 T300 180 T420 120"
          fill="none"
          stroke="url(#hero-path)"
          strokeWidth="4"
          strokeLinecap="round"
          pathLength={1}
        />

        <g className="quiz-hero-sun" filter="url(#hero-glow)">
          <circle cx="380" cy="95" r="28" fill="oklch(0.78 0.14 85 / 0.55)" />
        </g>

        <g className="quiz-hero-mountain">
          <path
            d="M0 340 L120 220 L200 280 L300 180 L400 260 L480 200 L480 420 L0 420 Z"
            fill="oklch(0.55 0.14 255 / 0.12)"
          />
          <path
            d="M0 360 L160 260 L260 300 L360 220 L480 280 L480 420 L0 420 Z"
            fill="oklch(0.42 0.14 255 / 0.18)"
          />
        </g>

        {[0, 1, 2, 3, 4].map((i) => (
          <circle
            key={i}
            className="quiz-hero-sparkle"
            style={{ animationDelay: `${i * 0.6}s` }}
            cx={100 + i * 70}
            cy={160 + (i % 2) * 40}
            r="3"
            fill="oklch(0.72 0.14 85)"
          />
        ))}
      </svg>
    </div>
  );
}
