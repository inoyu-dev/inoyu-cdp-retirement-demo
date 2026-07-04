"use client";

import { useEffect, useRef, useState } from "react";

/** Smoothly tween a number when the target changes (live score, etc.). */
export function useAnimatedNumber(target: number, durationMs = 700): number {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    const from = displayRef.current;
    if (from === target) return;

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(from + (target - from) * eased));
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [target, durationMs]);

  return display;
}

/** Brief CSS pulse class when dependency values change. */
export function useChartUpdatePulse(deps: readonly unknown[]): boolean {
  const [pulsing, setPulsing] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    setPulsing(true);
    const id = window.setTimeout(() => setPulsing(false), 650);
    return () => clearTimeout(id);
  }, deps);

  return pulsing;
}
