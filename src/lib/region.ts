import type { ContactChannel } from "./types";

/** Visitor market region — drives which follow-up channels are shown. */
export type VisitorRegion = "us" | "asia" | "other";

export const VISITOR_REGION_LABELS: Record<VisitorRegion, string> = {
  us: "United States",
  asia: "Asia-Pacific",
  other: "Other regions",
};

const US_COUNTRY = "US";

/** ISO 3166-1 alpha-2 codes mapped to Asia-Pacific for channel selection. */
const ASIA_COUNTRY_CODES = new Set([
  "JP",
  "TW",
  "TH",
  "KR",
  "SG",
  "MY",
  "ID",
  "PH",
  "VN",
  "IN",
  "HK",
  "MO",
  "CN",
  "BD",
  "PK",
  "LK",
  "MM",
  "KH",
  "LA",
  "BN",
  "NP",
  "AU",
  "NZ",
]);

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  JP: "Japan",
  TW: "Taiwan",
  TH: "Thailand",
  KR: "South Korea",
  SG: "Singapore",
  MY: "Malaysia",
  ID: "Indonesia",
  PH: "Philippines",
  VN: "Vietnam",
  IN: "India",
  HK: "Hong Kong",
  CN: "China",
  GB: "United Kingdom",
  DE: "Germany",
  FR: "France",
  CH: "Switzerland",
  CA: "Canada",
  AU: "Australia",
};

export function getCountryCodeFromRequest(request: Request): string | undefined {
  const raw =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry") ??
    request.headers.get("x-country-code") ??
    process.env.DEMO_COUNTRY_CODE;

  if (!raw || raw === "XX" || raw === "T1") return undefined;
  return raw.trim().toUpperCase();
}

export function regionFromCountryCode(countryCode?: string): VisitorRegion {
  if (!countryCode) return "other";
  if (countryCode === US_COUNTRY) return "us";
  if (ASIA_COUNTRY_CODES.has(countryCode)) return "asia";
  return "other";
}

export function countryDisplayName(countryCode?: string): string {
  if (!countryCode) return "your area";
  return COUNTRY_NAMES[countryCode] ?? countryCode;
}

export function isVisitorRegion(value: string): value is VisitorRegion {
  return value === "us" || value === "asia" || value === "other";
}

export function channelsForRegion(region: VisitorRegion): ContactChannel[] {
  switch (region) {
    case "us":
      return ["email", "browser_push", "sms", "phone_call", "on_page"];
    case "asia":
      return ["email", "browser_push", "whatsapp", "line", "on_page"];
    case "other":
      return ["email", "browser_push", "whatsapp", "on_page"];
    default: {
      const _exhaustive: never = region;
      return _exhaustive;
    }
  }
}

export function isChannelAllowedForRegion(
  channel: ContactChannel,
  region: VisitorRegion,
): boolean {
  return channelsForRegion(region).includes(channel);
}

export function defaultChannelForRegion(region: VisitorRegion): ContactChannel {
  return "email";
}
