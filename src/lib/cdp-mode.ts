import { isUnomiConfigured } from "./unomi-config";

export type CdpMode = "unomi-live" | "unomi-mock" | "unomi-error";

export function getCdpMode(unomiConfigured: boolean, unomiOk: boolean): CdpMode {
  if (!unomiConfigured) return "unomi-mock";
  return unomiOk ? "unomi-live" : "unomi-error";
}

export function isCdpMockMode(unomiConfigured: boolean): boolean {
  return !unomiConfigured;
}

export const CDP_MOCK_HEADLINE = "Apache Unomi mocked for this contest demo";

export const CDP_MOCK_SUMMARY =
  "Profiles, events, segments, and the CDP chat agent run against a local Unomi-compatible store with the same data model and API routes. Remote Apache Unomi deployment was deferred due to time constraints; the integration path is implemented and documented for production.";
