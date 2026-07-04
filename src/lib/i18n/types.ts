import type { ContactChannel } from "../types";
import type { PrimaryConcern, QuizAnswers } from "../types";
import type { VisitorRegion } from "../region";

export type AppLocale = "en" | "es" | "zh" | "fr" | "ja";

export const APP_LOCALES: AppLocale[] = ["en", "es", "zh", "fr", "ja"];

export const LOCALE_NATIVE_NAMES: Record<AppLocale, string> = {
  en: "English",
  es: "Español",
  zh: "中文",
  fr: "Français",
  ja: "日本語",
};

export const LOCALE_HTML_LANG: Record<AppLocale, string> = {
  en: "en",
  es: "es",
  zh: "zh-Hans",
  fr: "fr",
  ja: "ja",
};

export interface LocalizedChannelCopy {
  label: string;
  description: string;
  consentNote: string;
  badge?: string;
  regionHint?: string;
}

export interface LocalizedChannelGroup {
  title: string;
  subtitle?: string;
}

export interface QuizCopy {
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    trust: [string, string, string];
  };
  card: {
    titleQuiz: string;
    titleResults: string;
    descQuiz: string;
    descResults: string;
  };
  language: {
    label: string;
  };
  step1: {
    firstName: string;
    age: string;
    retireYears: string;
    savings: string;
    chooseOne: string;
    firstNamePlaceholder: string;
  };
  step2: {
    concernLegend: string;
    optionalReading: string;
    optionalReadingDesc: string;
    ssTitle: string;
    ssBody: string;
    k401Title: string;
    k401Body: string;
  };
  step3: {
    regionDetected: string;
    regionUndetected: string;
    yourRegion: string;
    selectRegion: string;
    regionOverride: string;
    regionDetectedTag: string;
    email: string;
    emailPlaceholder: string;
    followUpLegend: string;
    mobile: string;
    phonePlaceholder: string;
  };
  buttons: {
    back: string;
    continue: string;
    calculate: string;
    calculating: string;
    wait: string;
  };
  errors: {
    firstName: string;
    age: string;
    retireYears: string;
    email: string;
    channelRegion: string;
    phone: string;
    submit: string;
    generic: string;
  };
  steps: { title: string; hint: string }[];
  concerns: Record<PrimaryConcern, string>;
  savings: Record<QuizAnswers["currentSavings"], string>;
  regions: Record<VisitorRegion, string>;
  channels: Record<ContactChannel, LocalizedChannelCopy>;
  channelGroups: Record<VisitorRegion, LocalizedChannelGroup[]>;
  score: {
    badge: string;
    title: string;
    personalizing: string;
    fallback: string;
    readiness: string;
    age: string;
    targetRetire: string;
    topConcern: string;
    savingsBand: string;
    lowScore: string;
    highScore: string;
    progressAria: string;
  };
  followUp: Record<ContactChannel, string>;
  followUpVia: string;
  nextSteps: {
    title: string;
    description: string;
    loading: string;
  };
  didYouKnow: {
    label: string;
    step1: [string, string, string];
    step2: [string, string, string];
    step3: [string, string, string];
    step4: [string, string, string];
  };
  stepCoach: {
    personalizedLabel: string;
    loading: string;
  };
  stepHelp: {
    prompt: string;
    aiButton: string;
    humanButton: string;
    close: string;
    aiTab: string;
    humanTab: string;
    placeholder: string;
    send: string;
    loading: string;
    sendError: string;
    humanWait: string;
  };
  rewards: {
    stepTitle: string;
    step1: string;
    step2: string;
    step3: string;
    finalTitle: string;
    finalSubtitle: string;
  };
}
