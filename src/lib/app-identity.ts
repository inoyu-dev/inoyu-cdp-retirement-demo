/**
 * Single source of truth for demo slug, display name, Unomi identifiers, and storage keys.
 * Sibling demos (e.g. inoyu-cdp-ecommerce-demo) should copy this pattern with their own prefix.
 */

export const APP_SLUG = "inoyu-cdp-retirement-demo";
export const APP_DISPLAY_NAME = "Inoyu CDP Retirement Demo";
export const PRODUCTION_URL = "https://retirement.inoyu.dev";

/** Local-dev fallback only — set DEMO_PASSWORD in env before deploy or sharing. */
export const DEMO_PASSWORD_DEFAULT = "inoyu-demo-local";

/** Apache Unomi scope — must exist on the CDP server. */
export const UNOMI_SCOPE_DEFAULT = "inoyu-cdp-retirement";

/** Unomi context source itemId for visitor quiz / funnel events. */
export const UNOMI_SOURCE_VISITOR = "inoyu_cdp_retirement";

/** Serialized VisitorProfile blob stored on Unomi admin profiles. */
export const UNOMI_PROFILE_JSON_KEY = "inoyuCdpRetirementProfileJson";

/** AI usage records stored on Unomi admin profiles. */
export const UNOMI_AI_USAGE_JSON_KEY = "inoyuCdpRetirementAiUsageRecord";

export const DEMO_SESSION_COOKIE = "inoyu_cdp_retirement_demo_session";
export const VISITOR_SESSION_COOKIE = "inoyu_cdp_retirement_visitor_session";
export const VISITOR_PROFILE_COOKIE = "inoyu_cdp_retirement_visitor_profile";
export const UNOMI_PROFILE_COOKIE = "inoyu_cdp_retirement_unomi_profile";

export const SESSION_STORAGE_KEY = "inoyu_cdp_retirement_session_id";
export const PROFILE_STORAGE_KEY = "inoyu_cdp_retirement_profile_id";
export const UNOMI_PROFILE_STORAGE_KEY = "inoyu_cdp_retirement_unomi_profile_id";
export const LOCALE_STORAGE_KEY = "inoyu_cdp_retirement_locale";
export const DEMO_BROWSER_SESSION_KEY = "inoyu_cdp_retirement_browser_session";

export const DEMO_AUTH_SECRET_DEFAULT = "inoyu-cdp-retirement-demo-dev-secret";
export const OPENAI_APP_TITLE_DEFAULT = APP_DISPLAY_NAME;

export function resolveUnomiScope(): string {
  return process.env.UNOMI_SCOPE?.trim() || UNOMI_SCOPE_DEFAULT;
}
