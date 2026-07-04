import { NextResponse } from "next/server";
import {
  calculateLeadScore,
  calculateRetirementScore,
  deriveAllSegments,
} from "@/lib/quiz";
import { channelRequiresPhone } from "@/lib/contact-channels";
import { isChannelAllowedForRegion, isVisitorRegion } from "@/lib/region";
import type { ContactChannel, PrimaryConcern, QuizAnswers } from "@/lib/types";
import { getProfile, trackEvent, updateProfile } from "@/lib/unomi-client";

type TrackBody = {
  action: "track";
  profileId: string;
  eventType: string;
  properties?: Record<string, unknown>;
};

type QuizBody = {
  action: "quiz";
  profileId: string;
  answers: QuizAnswers;
};

function isPrimaryConcern(value: string): value is PrimaryConcern {
  return (
    value === "social_security" ||
    value === "401k_rollover" ||
    value === "healthcare_costs" ||
    value === "timeline_uncertainty"
  );
}

function isContactChannel(value: string): value is ContactChannel {
  return (
    value === "email" ||
    value === "browser_push" ||
    value === "sms" ||
    value === "whatsapp" ||
    value === "line" ||
    value === "phone_call" ||
    value === "on_page"
  );
}

function validateQuizAnswers(raw: QuizBody["answers"]): QuizAnswers | null {
  if (!raw?.firstName?.trim() || !raw.email?.trim()) return null;
  if (typeof raw.age !== "number" || raw.age < 18 || raw.age > 100) return null;
  if (typeof raw.retireYears !== "number" || raw.retireYears < 0) return null;
  if (
    raw.currentSavings !== "under_100k" &&
    raw.currentSavings !== "100k_500k" &&
    raw.currentSavings !== "500k_plus"
  ) {
    return null;
  }
  if (!isPrimaryConcern(raw.primaryConcern)) return null;
  if (!isContactChannel(raw.contactChannel)) return null;

  const contactRegion = raw.contactRegion;
  if (contactRegion !== undefined && !isVisitorRegion(contactRegion)) return null;
  const region = contactRegion ?? "other";
  if (!isChannelAllowedForRegion(raw.contactChannel, region)) return null;

  const phone = raw.phone?.trim() ?? "";
  if (channelRequiresPhone(raw.contactChannel) && !phone) return null;

  return {
    firstName: raw.firstName.trim(),
    age: raw.age,
    retireYears: raw.retireYears,
    currentSavings: raw.currentSavings,
    primaryConcern: raw.primaryConcern,
    email: raw.email.trim(),
    phone: phone || undefined,
    contactChannel: raw.contactChannel,
    contactRegion: contactRegion ?? region,
    smsConsent:
      raw.contactChannel === "sms" ||
      raw.contactChannel === "whatsapp" ||
      raw.contactChannel === "line",
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TrackBody | QuizBody;

    if (body.action === "track") {
      if (!body.profileId || !body.eventType) {
        return NextResponse.json({ error: "profileId and eventType required" }, { status: 400 });
      }
      const profile = await trackEvent(body.profileId, body.eventType, body.properties ?? {});
      if (!profile) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }
      return NextResponse.json({ profile });
    }

    if (body.action === "quiz") {
      const answers = validateQuizAnswers(body.answers);
      if (!answers || !body.profileId) {
        return NextResponse.json({ error: "Invalid quiz submission" }, { status: 400 });
      }

      const existing = await getProfile(body.profileId);
      if (!existing) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }

      const score = calculateRetirementScore(answers);
      const latest = (await getProfile(body.profileId)) ?? existing;
      const engagement = latest.quizEngagement;
      const segments = deriveAllSegments(answers, score, engagement);
      const leadScore = calculateLeadScore(
        answers,
        score,
        latest.contentEngagement,
        engagement,
      );

      const profile = await updateProfile(body.profileId, {
        quiz: {
          ...answers,
          score,
          completedAt: new Date().toISOString(),
        },
        contactRegion: answers.contactRegion,
        segments,
        leadScore,
      });

      if (engagement) {
        await trackEvent(body.profileId, "quizEngagementSummary", {
          rollup: engagement,
          overallTechnicalComfort: engagement.overallTechnicalComfort,
          overallPointerComfort: engagement.overallPointerComfort,
          totalDurationSeconds: engagement.totalDurationSeconds,
          avgEngagementScore: engagement.avgEngagementScore,
        });
      }

      await trackEvent(body.profileId, "quizCompleted", {
        score,
        segments,
        primaryConcern: answers.primaryConcern,
        contactChannel: answers.contactChannel,
        contactRegion: answers.contactRegion,
        quizEngagement: engagement,
      });

      return NextResponse.json({ profile, profileId: body.profileId });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to process event" }, { status: 500 });
  }
}
