import { CONTACT_CHANNEL_LABELS } from "./contact-channels";
import { VISITOR_REGION_LABELS } from "./region";
import type { VisitorRegion } from "./types";
import { pointerComfortLabel, technicalComfortLabel } from "./quiz-engagement";
import { CONCERN_LABELS } from "./quiz";
import type { ContactChannel, PrimaryConcern, UnomiEvent, VisitorProfile } from "./types";

export interface MarketerEventView {
  headline: string;
  detail?: string;
}

const TRAFFIC_SOURCE_LABELS: Record<string, string> = {
  meta: "Meta ad",
  taboola: "Taboola ad",
  google: "Google ad",
  direct: "direct visit",
};

const CONVERSION_LABELS: Record<
  NonNullable<VisitorProfile["conversionType"]>,
  string
> = {
  call_scheduled: "Asked to schedule a call",
  content_request: "Requested their personalized summary",
  trial_started: "Started a free trial",
};

function trafficLabel(source: unknown): string {
  if (typeof source !== "string") return "unknown source";
  return TRAFFIC_SOURCE_LABELS[source] ?? source;
}

function concernLabel(concern: unknown): string | null {
  if (typeof concern !== "string") return null;
  if (concern in CONCERN_LABELS) {
    return CONCERN_LABELS[concern as PrimaryConcern];
  }
  return null;
}

function channelLabel(channel: unknown): string | null {
  if (typeof channel !== "string") return null;
  if (channel in CONTACT_CHANNEL_LABELS) {
    return CONTACT_CHANNEL_LABELS[channel as ContactChannel];
  }
  return null;
}

function truncate(text: string, max = 120): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function formatSegments(segments: unknown): string | null {
  if (!Array.isArray(segments) || segments.length === 0) return null;
  return segments
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.replace(/_/g, " "))
    .join(", ");
}

export function describeEventForMarketer(event: UnomiEvent): MarketerEventView {
  const props = event.properties;

  switch (event.eventType) {
    case "view": {
      const source = trafficLabel(props.trafficSource);
      const region =
        typeof props.detectedRegion === "string" &&
        props.detectedRegion in VISITOR_REGION_LABELS
          ? VISITOR_REGION_LABELS[props.detectedRegion as VisitorRegion]
          : null;
      const country = typeof props.countryCode === "string" ? props.countryCode : null;
      const geoParts: string[] = [];
      if (country) geoParts.push(`IP country ${country}`);
      if (region) geoParts.push(`region ${region.toLowerCase()}`);
      const geo = geoParts.length > 0 ? ` · ${geoParts.join(" · ")}` : "";
      return {
        headline: "Landed on the retirement quiz",
        detail: `Arrived from ${source}${props.utmCampaign ? ` · campaign ${props.utmCampaign}` : ""}${geo}`,
      };
    }
    case "contentEngagement": {
      const topic = props.topic;
      if (topic === "social_security") {
        return {
          headline: "Read about Social Security timing",
          detail: "Spent time on educational content before submitting the quiz",
        };
      }
      if (topic === "401k_rollover") {
        return {
          headline: "Read about 401(k) rollovers",
          detail: "Spent time on educational content before submitting the quiz",
        };
      }
      return {
        headline: "Engaged with on-page content",
        detail: typeof topic === "string" ? `Topic: ${topic.replace(/_/g, " ")}` : undefined,
      };
    }
    case "quizStepView": {
      const step = typeof props.step === "number" ? props.step : null;
      return {
        headline: step ? `Viewing quiz step ${step}` : "Viewing a quiz step",
        detail: "Visitor entered this step of the funnel",
      };
    }
        case "quizStepEngagement": {
      const step = typeof props.step === "number" ? props.step : null;
      const duration =
        typeof props.durationSeconds === "number" ? props.durationSeconds : null;
      const active =
        typeof props.activeSeconds === "number" ? props.activeSeconds : null;
      const comfort =
        typeof props.technicalComfort === "string"
          ? technicalComfortLabel(
              props.technicalComfort as "high" | "moderate" | "low" | "unknown",
            )
          : null;
      const typingInterval =
        typeof props.typing === "object" &&
        props.typing !== null &&
        typeof (props.typing as { avgIntervalMs?: unknown }).avgIntervalMs === "number"
          ? (props.typing as { avgIntervalMs: number }).avgIntervalMs
          : null;
      const mouse =
        typeof props.mouseMovements === "number" ? props.mouseMovements : null;
      const pointerComfort =
        typeof props.pointerComfort === "string"
          ? pointerComfortLabel(
              props.pointerComfort as "high" | "moderate" | "low" | "unknown",
            )
          : null;
      const pointer =
        typeof props.pointer === "object" && props.pointer !== null
          ? (props.pointer as {
              impreciseClicks?: number;
              correctiveMovements?: number;
              missedTargetRetries?: number;
            })
          : null;

      const parts: string[] = [];
      if (duration !== null) parts.push(`On step ${step ?? "?"} for ${duration}s`);
      if (active !== null) parts.push(`${active}s active`);
      if (mouse !== null) parts.push(`${mouse} mouse moves`);
      if (pointer?.impreciseClicks) parts.push(`${pointer.impreciseClicks} miss-clicks`);
      if (pointer?.correctiveMovements) parts.push(`${pointer.correctiveMovements} path corrections`);
      if (pointer?.missedTargetRetries) parts.push(`${pointer.missedTargetRetries} click retries`);
      if (typingInterval !== null) parts.push(`~${typingInterval}ms between keystrokes`);
      if (comfort) parts.push(comfort.toLowerCase());
      if (pointerComfort) parts.push(pointerComfort.toLowerCase());

      return {
        headline: step ? `Finished quiz step ${step}` : "Finished a quiz step",
        detail: parts.length > 0 ? parts.join(" · ") : undefined,
      };
    }
    case "quizEngagementSummary": {
      const comfort =
        typeof props.overallTechnicalComfort === "string"
          ? technicalComfortLabel(
              props.overallTechnicalComfort as "high" | "moderate" | "low" | "unknown",
            )
          : null;
      const pointerOverall =
        typeof props.overallPointerComfort === "string"
          ? pointerComfortLabel(
              props.overallPointerComfort as "high" | "moderate" | "low" | "unknown",
            )
          : null;
      const total =
        typeof props.totalDurationSeconds === "number" ? props.totalDurationSeconds : null;
      const score =
        typeof props.avgEngagementScore === "number" ? props.avgEngagementScore : null;
      const parts: string[] = [];
      if (total !== null) parts.push(`${total}s total on quiz steps`);
      if (score !== null) parts.push(`engagement score ${score}/100`);
      if (comfort) parts.push(comfort.toLowerCase());
      if (pointerOverall) parts.push(pointerOverall.toLowerCase());
      return {
        headline: "Quiz behavior profile captured",
        detail: parts.length > 0 ? parts.join(" · ") : undefined,
      };
    }
    case "quizChatOpened": {
      const step = typeof props.step === "number" ? props.step : null;
      const mode = props.mode === "human" ? "human specialist" : "AI guide";
      return {
        headline: step ? `Opened ${mode} chat on step ${step}` : `Opened ${mode} chat`,
        detail: "Visitor asked for help without leaving the quiz",
      };
    }
    case "humanChatRequested": {
      const step = typeof props.step === "number" ? props.step : null;
      return {
        headline: "Requested a human advisor",
        detail: step ? `While on quiz step ${step} — prioritize handoff` : "During the quiz — prioritize handoff",
      };
    }
    case "quizChatMessage": {
      const step = typeof props.step === "number" ? props.step : null;
      const mode = props.mode === "human" ? "human chat" : "AI chat";
      return {
        headline: "Sent a message in quiz chat",
        detail: step ? `${mode} · step ${step}` : mode,
      };
    }
        case "quizCompleted": {
      const score = typeof props.score === "number" ? props.score : null;
      const concern = concernLabel(props.primaryConcern);
      const channel = channelLabel(props.contactChannel);
      const segments = formatSegments(props.segments);

      const detailParts: string[] = [];
      if (score !== null) detailParts.push(`Readiness score ${score}/100`);
      if (concern) detailParts.push(`Top concern: ${concern.toLowerCase()}`);
      if (channel) detailParts.push(`Wants follow-up via ${channel.toLowerCase()}`);
      if (
        typeof props.contactRegion === "string" &&
        props.contactRegion in VISITOR_REGION_LABELS
      ) {
        detailParts.push(
          `Region: ${VISITOR_REGION_LABELS[props.contactRegion as VisitorRegion].toLowerCase()}`,
        );
      }
      if (segments) detailParts.push(`Segments: ${segments}`);

      return {
        headline: "Completed the retirement quiz",
        detail: detailParts.length > 0 ? detailParts.join(" · ") : undefined,
      };
    }
    case "smsStarted":
      return {
        headline: "Personalized conversation started",
        detail: "First follow-up message sent based on their quiz and reading behavior",
      };
    case "smsReply": {
      const leadMessage = typeof props.leadMessage === "string" ? props.leadMessage : null;
      const conversion = props.conversionType;

      if (conversion === "call_scheduled") {
        return {
          headline: CONVERSION_LABELS.call_scheduled,
          detail: leadMessage ? `They wrote: “${truncate(leadMessage)}”` : undefined,
        };
      }
      if (conversion === "content_request") {
        return {
          headline: CONVERSION_LABELS.content_request,
          detail: leadMessage ? `They wrote: “${truncate(leadMessage)}”` : undefined,
        };
      }
      if (conversion === "trial_started") {
        return {
          headline: CONVERSION_LABELS.trial_started,
          detail: leadMessage ? `They wrote: “${truncate(leadMessage)}”` : undefined,
        };
      }

      return {
        headline: "Replied in the conversation",
        detail: leadMessage ? `They wrote: “${truncate(leadMessage)}”` : undefined,
      };
    }
    case "conversion": {
      const conversion = props.conversionType;
      if (conversion === "call_scheduled") {
        return { headline: "Lead converted — call requested", detail: "Ready for advisor handoff" };
      }
      if (conversion === "content_request") {
        return {
          headline: "Lead converted — content requested",
          detail: "Send the personalized breakdown they asked for",
        };
      }
      if (conversion === "trial_started") {
        return { headline: "Lead converted — trial started", detail: "Move to onboarding flow" };
      }
      return { headline: "Lead converted", detail: undefined };
    }
    default:
      return {
        headline: event.eventType.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim(),
        detail: undefined,
      };
  }
}
