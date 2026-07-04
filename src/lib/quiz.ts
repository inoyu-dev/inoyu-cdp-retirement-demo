import { deriveEngagementSegments } from "./quiz-engagement";
import type { PrimaryConcern, QuizAnswers, VisitorProfile } from "./types";

export const CONCERN_LABELS: Record<PrimaryConcern, string> = {
  social_security: "Will Social Security be enough?",
  "401k_rollover": "What to do with my 401(k)",
  healthcare_costs: "Paying for healthcare after I retire",
  timeline_uncertainty: "Not sure I can retire on time",
};

export const SAVINGS_LABELS: Record<QuizAnswers["currentSavings"], string> = {
  under_100k: "Less than $100,000",
  "100k_500k": "$100,000 to $500,000",
  "500k_plus": "More than $500,000",
};

export function calculateRetirementScore(answers: QuizAnswers): number {
  let score = 50;

  if (answers.age >= 55) score += 5;
  if (answers.retireYears <= 5) score -= 8;
  else if (answers.retireYears <= 8) score -= 4;
  else score += 4;

  switch (answers.currentSavings) {
    case "under_100k":
      score -= 12;
      break;
    case "100k_500k":
      score += 4;
      break;
    case "500k_plus":
      score += 14;
      break;
    default: {
      const _exhaustive: never = answers.currentSavings;
      return _exhaustive;
    }
  }

  if (answers.primaryConcern === "timeline_uncertainty") score -= 3;
  if (answers.primaryConcern === "social_security") score -= 2;

  return Math.max(28, Math.min(92, score));
}

export function deriveSegments(answers: QuizAnswers, score: number): string[] {
  const segments: string[] = [];

  if (answers.retireYears <= 7) segments.push("pre_retiree_near_term");
  if (score < 65) segments.push("readiness_gap");
  if (answers.primaryConcern === "social_security") {
    segments.push("social_security_anxious");
  }
  if (answers.primaryConcern === "401k_rollover") {
    segments.push("rollover_researcher");
  }
  if (answers.currentSavings === "under_100k") segments.push("savings_building_needed");

  if (answers.contactRegion === "us") segments.push("region_us");
  if (answers.contactRegion === "asia") segments.push("region_asia");
  if (answers.contactRegion === "other") segments.push("region_other");

  switch (answers.contactChannel) {
    case "email":
      segments.push("prefers_email");
      break;
    case "sms":
      segments.push("prefers_sms");
      break;
    case "whatsapp":
      segments.push("prefers_whatsapp");
      break;
    case "line":
      segments.push("prefers_line");
      break;
    case "phone_call":
      segments.push("prefers_phone_call");
      break;
    case "browser_push":
      segments.push("prefers_browser_push");
      break;
    case "on_page":
      segments.push("on_page_only");
      break;
    default: {
      const _exhaustive: never = answers.contactChannel;
      return _exhaustive;
    }
  }

  return segments;
}

export function deriveAllSegments(
  answers: QuizAnswers,
  score: number,
  quizEngagement?: VisitorProfile["quizEngagement"],
): string[] {
  return mergeSegments(deriveSegments(answers, score), deriveEngagementSegments(quizEngagement));
}

export function mergeSegments(base: string[], extra: string[]): string[] {
  return [...new Set([...base, ...extra])];
}

export function calculateLeadScore(
  answers: QuizAnswers,
  score: number,
  engagement: { socialSecurityViews: number; rolloverViews: number },
  quizEngagement?: VisitorProfile["quizEngagement"],
): number {
  let leadScore = score;

  if (engagement.socialSecurityViews >= 2) leadScore += 8;
  if (engagement.rolloverViews >= 2) leadScore += 6;
  if (answers.contactChannel === "sms") leadScore += 5;
  if (answers.contactChannel === "whatsapp" || answers.contactChannel === "line") leadScore += 5;
  if (answers.contactChannel === "phone_call") leadScore += 7;
  if (answers.contactChannel === "email") leadScore += 3;

  if (quizEngagement?.overallTechnicalComfort === "high") leadScore += 4;
  if ((quizEngagement?.avgEngagementScore ?? 0) >= 70) leadScore += 3;
  if (quizEngagement?.overallTechnicalComfort === "low") leadScore -= 2;
  if (quizEngagement?.overallPointerComfort === "high") leadScore += 2;
  if (quizEngagement?.overallPointerComfort === "low") leadScore -= 1;

  return Math.min(100, Math.max(0, leadScore));
}
