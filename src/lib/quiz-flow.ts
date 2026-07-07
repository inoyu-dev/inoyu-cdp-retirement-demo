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
    title: "Open quiz + dashboard",
    detail:
      "Desktop: two tabs — visitor quiz (Meta/Taboola links below) and Marketing dashboard. Mobile: complete the quiz first, then open the dashboard from the menu (☰).",
  },
  {
    id: 2,
    title: "Visitor shows intent",
    detail:
      "On Step 2, expand Social Security or 401(k) reading. Step timing, typing pace, pointer comfort, and contentEngagement events stream to the CDP with a persistent sessionId (required on Vercel).",
  },
  {
    id: 3,
    title: "Optional in-quiz help",
    detail:
      "Try the AI or human help chat on any step (LLM replies in AI mode). Rotating “Did you know?” tips on the step coach are static — no LLM. Chat messages become Unomi events.",
  },
  {
    id: 4,
    title: "Complete the quiz",
    detail:
      "Step 3 detects region from IP (overridable) and shows region-appropriate channels. Submit for score reveal — optionally tap “Personalize results with AI” on Step 4.",
  },
  {
    id: 5,
    title: "Review the rich profile",
    detail:
      "Dashboard → Visitors: hero banner, attribute cards, engagement charts, categorized journey timeline. Tap “Generate brief with AI” when you want an LLM summary (cached on the profile).",
  },
  {
    id: 6,
    title: "AI tools + follow-up",
    detail:
      "Open /dashboard/demo-usage (direct URL from this walkthrough) to see who signed in and what they opened (mirrored to Unomi demo_platform). Then AI & tools: Unomi agent chat and SMS simulator. Visitor follow-up opens their chosen channel — email, SMS, WhatsApp, LINE, callback, or on-page (previews only; events still log to Unomi).",
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
