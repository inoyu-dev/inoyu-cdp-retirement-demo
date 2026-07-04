import { NextResponse } from "next/server";
import {
  buildTemplatePersonalization,
  generateStepPersonalization,
} from "@/lib/ai-step-personalization";
import type { QuizPartialAnswers } from "@/lib/types";
import type { StepWillingnessSnapshot } from "@/lib/step-willingness";
import { getProfile } from "@/lib/unomi-client";

const CACHE_MS = 20_000;
const cache = new Map<string, { expires: number; payload: unknown }>();

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      profileId?: string;
      step?: number;
      partial?: QuizPartialAnswers;
      snapshot?: StepWillingnessSnapshot;
    };

    if (!body.profileId || !body.step || !body.snapshot) {
      return NextResponse.json({ error: "profileId, step, and snapshot required" }, { status: 400 });
    }

    const profile = await getProfile(body.profileId);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const fingerprint = [
      body.step,
      body.snapshot.willingness,
      body.snapshot.stepSeconds,
      body.snapshot.engagementScore,
      body.partial?.firstName,
      body.partial?.primaryConcern,
      body.partial?.currentSavings,
      profile.preferredLanguage,
    ].join(":");

    const now = Date.now();
    const hit = cache.get(fingerprint);
    if (hit && hit.expires > now) {
      return NextResponse.json(hit.payload);
    }

    const fallback = buildTemplatePersonalization(body.step, body.partial, body.snapshot);
    const personalization = await generateStepPersonalization(
      profile,
      body.step,
      body.partial,
      body.snapshot,
    );

    const payload = { personalization, fallbackUsed: personalization.nudge === fallback.nudge };
    cache.set(fingerprint, { expires: now + CACHE_MS, payload });

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "Failed to personalize step" }, { status: 500 });
  }
}
