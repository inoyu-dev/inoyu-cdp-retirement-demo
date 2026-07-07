"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildStepEngagementPayload,
  createActivityAccumulator,
  createPointerTrackState,
  createTypingAccumulator,
  recordPointerClick,
  recordPointerMove,
  recordTypingKeystroke,
  recordTypingPaste,
  type ActivityAccumulator,
  type PointerTrackState,
  type StepExitReason,
  type TypingAccumulator,
} from "@/lib/quiz-engagement";
import type { QuizStepId } from "@/lib/quiz-flow";
import {
  buildWillingnessSnapshot,
  createFieldTimingsMap,
  recordFieldBlur,
  recordFieldFocus,
  type StepWillingnessSnapshot,
} from "@/lib/step-willingness";
import { getSessionId } from "@/lib/session-id";

const IDLE_THRESHOLD_MS = 5000;
const ACTIVITY_TICK_MS = 1000;
const MOUSE_SAMPLE_MS = 120;


async function sendStepView(profileId: string, step: QuizStepId): Promise<void> {
  await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      action: "track",
      profileId,
      sessionId: getSessionId(),
      eventType: "quizStepView",
      properties: { step },
    }),
  });
}

async function sendStepEngagement(
  profileId: string,
  payload: ReturnType<typeof buildStepEngagementPayload>,
): Promise<void> {
  await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      action: "track",
      profileId,
      sessionId: getSessionId(),
      eventType: "quizStepEngagement",
      properties: payload,
    }),
  });
}

export function useQuizStepAnalytics(profileId: string | null, step: QuizStepId) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef(step);
  const stepStartedAtRef = useRef(Date.now());
  const lastActivityAtRef = useRef(Date.now());
  const lastMouseSampleRef = useRef(0);
  const activityRef = useRef<ActivityAccumulator>(createActivityAccumulator());
  const typingRef = useRef<TypingAccumulator>(createTypingAccumulator());
  const pointerTrackRef = useRef<PointerTrackState>(createPointerTrackState());
  const profileIdRef = useRef(profileId);
  const fieldTimingsRef = useRef(createFieldTimingsMap());
  const [willingness, setWillingness] = useState<StepWillingnessSnapshot>(() =>
    buildWillingnessSnapshot(step, Date.now(), 0, createActivityAccumulator(), createTypingAccumulator(), {}),
  );

  profileIdRef.current = profileId;
  stepRef.current = step;

  const markActive = useCallback(() => {
    lastActivityAtRef.current = Date.now();
  }, []);

  const resetStepMetrics = useCallback(() => {
    stepStartedAtRef.current = Date.now();
    lastActivityAtRef.current = Date.now();
    lastMouseSampleRef.current = 0;
    activityRef.current = createActivityAccumulator();
    typingRef.current = createTypingAccumulator();
    pointerTrackRef.current = createPointerTrackState();
    fieldTimingsRef.current = createFieldTimingsMap();
  }, []);

  const endStep = useCallback(async (exitedVia: StepExitReason) => {
    const id = profileIdRef.current;
    if (!id) return;

    const durationMs = Date.now() - stepStartedAtRef.current;
    if (durationMs < 500) return;

    const payload = buildStepEngagementPayload(
      stepRef.current,
      durationMs,
      activityRef.current,
      typingRef.current,
      exitedVia,
    );

    try {
      await sendStepEngagement(id, payload);
    } catch {
      // Non-blocking analytics
    }
  }, []);


  useEffect(() => {
    const id = profileId;
    if (!id) return;
    void sendStepView(id, step).catch(() => {
      // Non-blocking analytics
    });
  }, [profileId, step]);

  useEffect(() => {
    resetStepMetrics();
  }, [step, resetStepMetrics]);
  useEffect(() => {
    const update = () => {
      setWillingness(
        buildWillingnessSnapshot(
          stepRef.current,
          stepStartedAtRef.current,
          Date.now() - lastActivityAtRef.current,
          activityRef.current,
          typingRef.current,
          fieldTimingsRef.current,
        ),
      );
    };
    update();
    const id = window.setInterval(update, 2000);
    return () => window.clearInterval(id);
  }, [step]);



  useEffect(() => {
    const tick = window.setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivityAtRef.current;
      if (elapsed >= IDLE_THRESHOLD_MS) {
        activityRef.current.idleMs += ACTIVITY_TICK_MS;
      } else {
        activityRef.current.activeMs += ACTIVITY_TICK_MS;
      }
    }, ACTIVITY_TICK_MS);

    return () => window.clearInterval(tick);
  }, [step]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root || !profileId) return;

    const onMouseMove = (event: MouseEvent) => {
      const now = Date.now();
      if (now - lastMouseSampleRef.current < MOUSE_SAMPLE_MS) return;
      lastMouseSampleRef.current = now;
      activityRef.current.mouseMovements += 1;
      recordPointerMove(
        activityRef.current,
        pointerTrackRef.current,
        event.clientX,
        event.clientY,
        now,
      );
      markActive();
    };

    const onMouseDown = (event: MouseEvent) => {
      const now = Date.now();
      activityRef.current.mouseClicks += 1;
      recordPointerClick(
        activityRef.current,
        pointerTrackRef.current,
        event.target,
        event.clientX,
        event.clientY,
        now,
      );
      markActive();
    };

    const onScroll = () => {
      activityRef.current.scrollEvents += 1;
      markActive();
    };

    const fieldIdFor = (el: HTMLInputElement | HTMLTextAreaElement) =>
      el.id || el.name || "field";

    const onFocusIn = (event: FocusEvent) => {
      activityRef.current.focusChanges += 1;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        recordFieldFocus(fieldTimingsRef.current, fieldIdFor(target));
      }
      markActive();
    };

    const onFocusOut = (event: FocusEvent) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        recordFieldBlur(fieldTimingsRef.current, fieldIdFor(target));
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        recordTypingKeystroke(typingRef.current, event, target);
      } else {
        activityRef.current.keydownsOutsideInput += 1;
      }
      markActive();
    };

    const onPaste = (event: ClipboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        recordTypingPaste(typingRef.current, target);
        markActive();
      }
    };

    root.addEventListener("mousemove", onMouseMove, { passive: true });
    root.addEventListener("mousedown", onMouseDown);
    root.addEventListener("wheel", onScroll, { passive: true });
    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("focusout", onFocusOut);
    root.addEventListener("keydown", onKeyDown);
    root.addEventListener("paste", onPaste);

    return () => {
      root.removeEventListener("mousemove", onMouseMove);
      root.removeEventListener("mousedown", onMouseDown);
      root.removeEventListener("wheel", onScroll);
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
      root.removeEventListener("keydown", onKeyDown);
      root.removeEventListener("paste", onPaste);
    };
  }, [profileId, step, markActive]);

  useEffect(() => {
    const onLeave = () => {
      const id = profileIdRef.current;
      if (!id) return;
      const payload = buildStepEngagementPayload(
        stepRef.current,
        Date.now() - stepStartedAtRef.current,
        activityRef.current,
        typingRef.current,
        "leave",
      );
      void sendStepEngagement(id, payload);
    };

    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
  }, []);

  return { containerRef, endStep, resetStepMetrics, willingness };
}
