import type { AppLocale } from "./i18n/types";
import type { QuizEngagementRollup } from "./quiz-engagement";
import type { QuizStepId } from "./quiz-flow";
import type { VisitorRegion } from "./region";

export type { VisitorRegion };
export type { AppLocale };

export type TrafficSource = "meta" | "taboola" | "google" | "direct";

export type ContactChannel =
  | "email"
  | "browser_push"
  | "sms"
  | "whatsapp"
  | "line"
  | "phone_call"
  | "on_page";

export type PrimaryConcern =
  | "social_security"
  | "401k_rollover"
  | "healthcare_costs"
  | "timeline_uncertainty";

export interface QuizAnswers {
  firstName: string;
  age: number;
  retireYears: number;
  currentSavings: "under_100k" | "100k_500k" | "500k_plus";
  primaryConcern: PrimaryConcern;
  email: string;
  phone?: string;
  contactChannel: ContactChannel;
  /** Visitor-selected region (may differ from IP-detected region). */
  contactRegion?: VisitorRegion;
  preferredLanguage?: AppLocale;
  /** A/B quiz variant assigned at first visit. */
  quizVariantId?: string;
  /** @deprecated use contactChannel === "sms" */
  smsConsent?: boolean;
}

export interface UnomiEvent {
  id: string;
  eventType: string;
  timestamp: string;
  scope: string;
  properties: Record<string, unknown>;
}



export type QuizChatMode = "ai" | "human";

export interface QuizPartialAnswers {
  firstName?: string;
  age?: number;
  retireYears?: number;
  currentSavings?: QuizAnswers["currentSavings"];
  primaryConcern?: PrimaryConcern;
  email?: string;
}

export interface QuizChatMessage {
  id: string;
  role: "visitor" | "ai" | "human";
  body: string;
  timestamp: string;
  step: QuizStepId;
  mode: QuizChatMode;
}


export interface QuizChatState {
  messages: QuizChatMessage[];
  humanRequested?: boolean;
  lastMode?: QuizChatMode;
}

export interface QuizFunnelState {
  currentStep?: QuizStepId;
  maxStepReached?: QuizStepId;
  completed?: boolean;
  abandonedAtStep?: QuizStepId;
  abandonedAt?: string;
  lastStepEnteredAt?: string;
}

export interface StepFunnelStats {
  step: QuizStepId;
  title: string;
  hint: string;
  entered: number;
  activeNow: number;
  abandoned: number;
  leaveExits: number;
  dropOffRate: number;
  avgDurationSeconds: number | null;
  avgEngagementScore: number | null;
}

export interface QuizFunnelAggregate {
  totalVisitors: number;
  completed: number;
  inProgress: number;
  abandoned: number;
  completionRate: number;
  steps: StepFunnelStats[];
  hotspotStep: QuizStepId | null;
  hotspotLabel: string | null;
}

export interface QuizFunnelAnalysis {
  headline: string;
  summary: string;
  hotspotStep: QuizStepId | null;
  hypotheses: string[];
  recommendations: string[];
  confidence: "high" | "medium" | "low";
  evidence: string[];
}


export interface QuizVariantTweaks {
  showScoreTeaserOnContact?: boolean;
  inlineConcernEducation?: boolean;
}

export interface QuizVariantConfig {
  id: string;
  name: string;
  description: string;
  /** Order of quiz modules shown to the visitor (module 4 = score is always last). */
  stepOrder: [QuizStepId, QuizStepId, QuizStepId, QuizStepId];
  tweaks?: QuizVariantTweaks;
  status: "draft" | "active" | "archived";
  createdAt: string;
  basedOnHotspot?: QuizStepId | null;
}

export interface QuizVariantProposal {
  id: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  reviewedAt?: string;
  rationale: string;
  expectedLift: string;
  confidence: "high" | "medium" | "low";
  hotspotStep: QuizStepId | null;
  controlStepOrder: [QuizStepId, QuizStepId, QuizStepId, QuizStepId];
  proposed: {
    name: string;
    description: string;
    stepOrder: [QuizStepId, QuizStepId, QuizStepId, QuizStepId];
    tweaks?: QuizVariantTweaks;
  };
  analysisHeadline?: string;
}

export interface QuizExperiment {
  controlVariantId: "control";
  testVariantId: string;
  trafficSplit: number;
  startedAt: string;
  proposalId: string;
}

export interface QuizExperimentStats {
  control: { visitors: number; completed: number; completionRate: number };
  test: { visitors: number; completed: number; completionRate: number };
}

/** On-demand AI output cached on a visitor profile (no automatic LLM calls). */
export interface ProfileAiArtifact<T> {
  source: "ai" | "template";
  generatedAt: string;
  data: T;
}

export interface VisitorProfileAiArtifacts {
  summary?: ProfileAiArtifact<AiSummary>;
  /** Keyed by step-coach fingerprint (step + willingness + partial answers). */
}

export interface CachedFunnelAnalysis {
  fingerprint: string;
  generatedAt: string;
  analysis: QuizFunnelAnalysis;
}

export interface VisitorProfile {
  profileId: string;
  /** Profile id assigned by remote Apache Unomi (may differ from profileId). */
  unomiProfileId?: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  trafficSource: TrafficSource;
  utmCampaign?: string;
  /** ISO country from IP / edge headers at first visit. */
  countryCode?: string;
  /** Region inferred from countryCode. */
  detectedRegion?: VisitorRegion;
  /** Region chosen on quiz step 3 (defaults to detectedRegion). */
  contactRegion?: VisitorRegion;
  /** Visitor UI language (quiz + AI copy). */
  preferredLanguage?: AppLocale;
  /** A/B quiz variant assigned at first visit. */
  quizVariantId?: string;
  /** Demo tester identity when exploring behind the demo gate. */
  demoTesterId?: string;
  demoTesterUsername?: string;
  pageViews: number;
  contentEngagement: {
    socialSecurityViews: number;
    rolloverViews: number;
    totalDwellSeconds: number;
  };
  quiz?: Partial<QuizAnswers> & { score?: number; completedAt?: string };
  /** Per-step timing, activity, and typing comfort rollup. */
  quizEngagement?: QuizEngagementRollup;
  /** Quiz step funnel position and abandonment. */
  quizFunnel?: QuizFunnelState;
  /** In-quiz AI / human chat thread. */
  quizChat?: QuizChatState;
  /** Cached on-demand AI outputs for this visitor. */
  aiArtifacts?: VisitorProfileAiArtifacts;
  segments: string[];
  leadScore: number;
  events: UnomiEvent[];
  smsThread: SmsMessage[];
  converted: boolean;
  conversionType?: "content_request" | "call_scheduled" | "trial_started";
}

export interface SmsMessage {
  id: string;
  role: "agent" | "lead";
  body: string;
  timestamp: string;
}

export interface AiSummary {
  headline: string;
  narrative: string;
  primaryMotivation: string;
  recommendedApproach: string;
  suggestedOpener: string;
  /** Warm, personal message for the visitor — validates their concern and invites engagement. */
  empatheticResponse: string;
  /** Plain-language action items for the visitor (pre-retiree). */
  visitorNextSteps: string[];
  /** Action items for the media buyer / marketing user. */
  marketerNextSteps: string[];
  confidence: "high" | "medium";
  signals: string[];
}

export interface ContextResponse {
  profileId: string;
  /** Profile id assigned by remote Apache Unomi (may differ from profileId). */
  unomiProfileId?: string;
  sessionId: string;
  profile?: VisitorProfile;
  quizVariant?: QuizVariantConfig;
  detectedRegion: VisitorRegion;
  countryCode?: string;
}
