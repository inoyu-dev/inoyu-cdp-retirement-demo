export type CdpMode = "unomi-live" | "unomi-mock" | "unomi-error";

export function getCdpMode(unomiConfigured: boolean, unomiOk: boolean): CdpMode {
  if (!unomiConfigured) return "unomi-mock";
  return unomiOk ? "unomi-live" : "unomi-error";
}

export function isCdpMockMode(unomiConfigured: boolean): boolean {
  return !unomiConfigured;
}

export const CDP_MOCK_HEADLINE = "Apache Unomi mocked for local development";

export const CDP_MOCK_SUMMARY =
  "Profiles, events, segments, and the CDP chat agent run against a local Unomi-compatible store with the same data model and API routes. Configure UNOMI_BASE_URL to connect to a live Apache Unomi CDP (e.g. Inoyu managed hosting).";
