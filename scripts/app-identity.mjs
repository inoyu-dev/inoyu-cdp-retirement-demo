/** Mirror of src/lib/app-identity.ts for Node scripts and tests (keep in sync). */

export const APP_SLUG = "inoyu-cdp-retirement-demo";
export const APP_DISPLAY_NAME = "Inoyu CDP Retirement Demo";
export const PRODUCTION_URL = "https://retirement.inoyu.dev";
export const DEMO_PASSWORD_DEFAULT = "inoyu-demo-local";
export const UNOMI_SCOPE_DEFAULT = "inoyu-cdp-retirement";
export const UNOMI_SOURCE_VISITOR = "inoyu_cdp_retirement";
export const UNOMI_PROFILE_JSON_KEY = "inoyuCdpRetirementProfileJson";
export const UNOMI_AI_USAGE_JSON_KEY = "inoyuCdpRetirementAiUsageRecord";

export const DEMO_SESSION_COOKIE = "inoyu_cdp_retirement_demo_session";
export const VISITOR_SESSION_COOKIE = "inoyu_cdp_retirement_visitor_session";
export const VISITOR_PROFILE_COOKIE = "inoyu_cdp_retirement_visitor_profile";
export const UNOMI_PROFILE_COOKIE = "inoyu_cdp_retirement_unomi_profile";

export function resolveUnomiScope() {
  return (process.env.UNOMI_SCOPE || "").trim() || UNOMI_SCOPE_DEFAULT;
}
