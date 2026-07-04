import type { ContactChannel } from "./types";
import type { VisitorRegion } from "./region";
import { channelsForRegion } from "./region";

export type ChannelRegion = "us" | "asia" | "global" | "none";

export interface ContactChannelOption {
  value: ContactChannel;
  label: string;
  description: string;
  badge?: string;
  region: ChannelRegion;
  regionHint?: string;
  requiresPhone: boolean;
  consentNote: string;
}

export const CONTACT_CHANNEL_OPTIONS: ContactChannelOption[] = [
  {
    value: "email",
    label: "Email my free score",
    description: "Best for a summary you can read and save. Most people prefer this.",
    badge: "Most popular",
    region: "global",
    requiresPhone: false,
    consentNote: "We will send one personalized email. Unsubscribe anytime.",
  },
  {
    value: "browser_push",
    label: "Browser notification",
    description: "A gentle alert on this device when your score is ready — no text or email.",
    region: "global",
    requiresPhone: false,
    consentNote: "You control this in your browser settings. No phone number needed.",
  },
  {
    value: "sms",
    label: "Text message (SMS)",
    description: "Fast follow-up on your phone. Common in the US for time-sensitive updates.",
    region: "us",
    regionHint: "Popular in the US",
    requiresPhone: true,
    consentNote: "By choosing SMS you agree to receive texts. Reply STOP to opt out.",
  },
  {
    value: "phone_call",
    label: "Call me back",
    description: "Speak with someone at a time you choose. Common for retirement planning in the US.",
    region: "us",
    regionHint: "Popular in the US",
    requiresPhone: true,
    consentNote: "We will call the number you provide. You can reschedule or decline anytime.",
  },
  {
    value: "whatsapp",
    label: "WhatsApp message",
    description: "Chat on WhatsApp — preferred by many in India, Southeast Asia, and Latin America.",
    region: "asia",
    regionHint: "Popular in Asia",
    requiresPhone: true,
    consentNote: "Messages sent via WhatsApp Business. Reply STOP to opt out.",
  },
  {
    value: "line",
    label: "LINE message",
    description: "Chat on LINE — widely used in Japan, Taiwan, and Thailand.",
    region: "asia",
    regionHint: "Popular in Asia",
    requiresPhone: true,
    consentNote: "Messages sent via LINE Official Account. You can block us anytime.",
  },
  {
    value: "on_page",
    label: "Show results here only",
    description: "No messages sent. View your score on the next screen.",
    region: "none",
    requiresPhone: false,
    consentNote: "We will not email, text, or notify you unless you ask later.",
  },
];

/** Grouped for the quiz UI — US/global first, then Asia messaging apps. */
export const CONTACT_CHANNEL_GROUPS: {
  title: string;
  subtitle?: string;
  channels: ContactChannel[];
}[] = [
  {
    title: "Email & alerts",
    channels: ["email", "browser_push"],
  },
  {
    title: "Phone & text (US)",
    subtitle: "Common for financial follow-up in the United States",
    channels: ["sms", "phone_call"],
  },
  {
    title: "Messaging apps (Asia & global)",
    subtitle: "WhatsApp and LINE are top channels across much of Asia",
    channels: ["whatsapp", "line"],
  },
  {
    title: "No outbound messages",
    channels: ["on_page"],
  },
];

export const CONTACT_CHANNEL_LABELS: Record<ContactChannel, string> = {
  email: "Email",
  browser_push: "Browser push",
  sms: "SMS",
  whatsapp: "WhatsApp",
  line: "LINE",
  phone_call: "Phone call",
  on_page: "On-page only",
};

const optionByValue = new Map(CONTACT_CHANNEL_OPTIONS.map((o) => [o.value, o]));

export function channelRequiresPhone(channel: ContactChannel): boolean {
  return optionByValue.get(channel)?.requiresPhone ?? false;
}

export function isMessagingChannel(channel: ContactChannel): boolean {
  return channel === "sms" || channel === "whatsapp" || channel === "line";
}

export function isOutboundChannel(channel: ContactChannel): boolean {
  return channel !== "on_page";
}

export function getContactChannelOption(channel: ContactChannel): ContactChannelOption | undefined {
  return optionByValue.get(channel);
}

function filterGroupChannels(channels: ContactChannel[], allowed: Set<ContactChannel>): ContactChannel[] {
  return channels.filter((c) => allowed.has(c));
}

/** Channel groups filtered to what is available in the visitor's region. */
export function getContactChannelGroupsForRegion(region: VisitorRegion): {
  title: string;
  subtitle?: string;
  channels: ContactChannel[];
}[] {
  const allowed = new Set(channelsForRegion(region));

  switch (region) {
    case "us":
      return [
        {
          title: "Email & alerts",
          channels: filterGroupChannels(["email", "browser_push"], allowed),
        },
        {
          title: "Phone & text",
          subtitle: "Common for financial follow-up in the United States",
          channels: filterGroupChannels(["sms", "phone_call"], allowed),
        },
        {
          title: "No outbound messages",
          channels: filterGroupChannels(["on_page"], allowed),
        },
      ].filter((g) => g.channels.length > 0);
    case "asia":
      return [
        {
          title: "Email & alerts",
          channels: filterGroupChannels(["email", "browser_push"], allowed),
        },
        {
          title: "Messaging apps",
          subtitle: "WhatsApp and LINE are top channels across much of Asia-Pacific",
          channels: filterGroupChannels(["whatsapp", "line"], allowed),
        },
        {
          title: "No outbound messages",
          channels: filterGroupChannels(["on_page"], allowed),
        },
      ].filter((g) => g.channels.length > 0);
    case "other":
      return [
        {
          title: "Email & alerts",
          channels: filterGroupChannels(["email", "browser_push"], allowed),
        },
        {
          title: "WhatsApp",
          subtitle: "Popular worldwide outside the US",
          channels: filterGroupChannels(["whatsapp"], allowed),
        },
        {
          title: "No outbound messages",
          channels: filterGroupChannels(["on_page"], allowed),
        },
      ].filter((g) => g.channels.length > 0);
    default: {
      const _exhaustive: never = region;
      return _exhaustive;
    }
  }
}
