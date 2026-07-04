import { calculateRetirementScore } from "./quiz";
import { CONCERN_LABELS, SAVINGS_LABELS } from "./quiz";
import type { ContactChannel, PrimaryConcern, QuizAnswers } from "./types";
import type { VisitorRegion } from "./region";
import { getLocalizedChannelGroups } from "./i18n";
import type { AppLocale } from "./i18n/types";

export interface QuizSimulationInput {
  age: number;
  retireYears: number;
  currentSavings: QuizAnswers["currentSavings"];
  primaryConcern: PrimaryConcern;
  contactChannel?: ContactChannel;
  contactRegion?: VisitorRegion;
  locale?: AppLocale;
}

const SAVINGS_MIDPOINT: Record<QuizAnswers["currentSavings"], number> = {
  under_100k: 55_000,
  "100k_500k": 275_000,
  "500k_plus": 625_000,
};

const ANNUAL_GROWTH: Record<QuizAnswers["currentSavings"], number> = {
  under_100k: 0.045,
  "100k_500k": 0.055,
  "500k_plus": 0.05,
};

const ANNUAL_CONTRIBUTION: Record<QuizAnswers["currentSavings"], number> = {
  under_100k: 8_500,
  "100k_500k": 14_000,
  "500k_plus": 18_000,
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function formatCompactUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return `$${Math.round(value)}`;
}

export function previewRetirementScore(input: QuizSimulationInput): number {
  return calculateRetirementScore({
    firstName: "Preview",
    age: clamp(input.age, 45, 75),
    retireYears: clamp(input.retireYears, 1, 25),
    currentSavings: input.currentSavings,
    primaryConcern: input.primaryConcern,
    email: "preview@example.com",
    contactChannel: input.contactChannel ?? "email",
    contactRegion: input.contactRegion,
  });
}

export interface NestEggPoint {
  label: string;
  projected: number;
  target: number;
  yearIndex: number;
}

/** Simulated nest-egg curve from today to retirement — illustrative, not financial advice. */
export function buildNestEggProjection(input: QuizSimulationInput): NestEggPoint[] {
  const years = clamp(Math.round(input.retireYears), 1, 25);
  const start = SAVINGS_MIDPOINT[input.currentSavings];
  const growth = ANNUAL_GROWTH[input.currentSavings];
  const contribution = ANNUAL_CONTRIBUTION[input.currentSavings];
  const targetMultiplier = input.primaryConcern === "timeline_uncertainty" ? 1.15 : 1.08;
  const target = start * targetMultiplier + years * contribution * 0.85;

  const points: NestEggPoint[] = [];
  let balance = start;
  for (let i = 0; i <= years; i += 1) {
    points.push({
      label: i === 0 ? "Now" : i === years ? "Retire" : `+${i}y`,
      projected: Math.round(balance),
      target: Math.round(target),
      yearIndex: i,
    });
    balance = balance * (1 + growth) + contribution;
  }
  return points;
}

export interface ReadinessFactor {
  factor: string;
  score: number;
  highlight: boolean;
}

export function buildReadinessFactors(input: QuizSimulationInput): ReadinessFactor[] {
  const ageScore = clamp(((input.age - 45) / 30) * 100, 20, 95);
  const horizonScore = clamp(100 - input.retireYears * 3.5, 25, 95);
  const savingsScore =
    input.currentSavings === "500k_plus" ? 92 : input.currentSavings === "100k_500k" ? 68 : 38;

  const concernScores: Record<PrimaryConcern, number> = {
    social_security: 52,
    "401k_rollover": 58,
    healthcare_costs: 48,
    timeline_uncertainty: 42,
  };

  return [
    { factor: "Time horizon", score: Math.round(horizonScore), highlight: false },
    { factor: "Savings band", score: savingsScore, highlight: false },
    { factor: "Age buffer", score: Math.round(ageScore), highlight: false },
    {
      factor: CONCERN_LABELS[input.primaryConcern].replace(/\?$/, ""),
      score: concernScores[input.primaryConcern],
      highlight: true,
    },
  ];
}

export interface ConcernWeight {
  id: PrimaryConcern;
  label: string;
  weight: number;
}

export function buildConcernWeights(selected: PrimaryConcern): ConcernWeight[] {
  const ids: PrimaryConcern[] = [
    "social_security",
    "401k_rollover",
    "healthcare_costs",
    "timeline_uncertainty",
  ];
  return ids.map((id) => ({
    id,
    label: CONCERN_LABELS[id].replace(/^Will |^What |^Paying |^Not sure /, "").slice(0, 28),
    weight: id === selected ? 100 : 35 + ids.indexOf(id) * 8,
  }));
}

export interface ChannelFit {
  channel: string;
  fit: number;
  selected: boolean;
}

export function buildChannelFit(input: QuizSimulationInput): ChannelFit[] {
  const region = input.contactRegion ?? "other";
  const locale = input.locale ?? "en";
  const groups = getLocalizedChannelGroups(region, locale);
  const allowed = new Set(groups.flatMap((g) => g.channels));

  const baseFit: Partial<Record<ContactChannel, number>> = {
    email: 88,
    browser_push: 72,
    sms: region === "us" ? 91 : 55,
    whatsapp: region === "asia" || region === "other" ? 90 : 62,
    line: region === "asia" ? 93 : 48,
    phone_call: region === "us" ? 86 : 50,
    on_page: 78,
  };

  return [...allowed].map((channel) => ({
    channel: channel.replace("_", " "),
    fit: baseFit[channel] ?? 70,
    selected: channel === input.contactChannel,
  }));
}

export function savingsBandLabel(band: QuizAnswers["currentSavings"]): string {
  return SAVINGS_LABELS[band];
}
