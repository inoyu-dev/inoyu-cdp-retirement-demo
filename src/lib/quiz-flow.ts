import type { ContactChannel } from "./types";

export const QUIZ_STEPS = [
  { id: 1, title: "About you", hint: "Name, age, and savings" },
  { id: 2, title: "Your concerns", hint: "What worries you most" },
  { id: 3, title: "Stay in touch", hint: "Region and channel choice" },
  { id: 4, title: "Your score", hint: "Results and next step" },
] as const;

export type QuizStepId = (typeof QUIZ_STEPS)[number]["id"];

export const DEMO_FLOW_STEPS = [
  {
    id: 1,
    title: "Open two tabs",
    detail: "Tab A: visitor quiz (use simulated Meta or Taboola links below). Tab B: Marketing dashboard.",
  },
  {
    id: 2,
    title: "Visitor shows intent",
    detail: "On quiz Step 2, expand Social Security or 401(k) reading — contentEngagement events appear on the dashboard timeline.",
  },
  {
    id: 3,
    title: "Visitor completes the quiz",
    detail: "Step 3 auto-detects region from IP, lets the visitor override it, and shows only relevant channels (US: SMS/call; Asia: WhatsApp/LINE; other: WhatsApp). Then score reveal.",
  },
  {
    id: 4,
    title: "Marketing user reviews the profile",
    detail: "On the dashboard: lead score, segments, AI agent brief, and full event timeline (polls every 2s).",
  },
  {
    id: 5,
    title: "Visitor follow-up",
    detail: "Visitor continues to their chosen channel — email, SMS, WhatsApp, LINE, callback, or on-page score — personalized from the profile.",
  },
] as const;

export function followUpLabel(channel: ContactChannel): string {
  switch (channel) {
    case "email":
      return "See my email preview";
    case "browser_push":
      return "See my notification";
    case "sms":
      return "Open my text thread";
    case "whatsapp":
      return "Open my WhatsApp chat";
    case "line":
      return "Open my LINE chat";
    case "phone_call":
      return "Schedule my callback";
    case "on_page":
      return "Done — results are on this page";
    default: {
      const _exhaustive: never = channel;
      return _exhaustive;
    }
  }
}
