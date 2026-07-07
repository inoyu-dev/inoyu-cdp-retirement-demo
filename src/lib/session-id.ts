import {
  PROFILE_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  UNOMI_PROFILE_STORAGE_KEY,
} from "./app-identity";

export { PROFILE_STORAGE_KEY, SESSION_STORAGE_KEY, UNOMI_PROFILE_STORAGE_KEY };

/** Browser session id persisted for Unomi context + profile rehydration. */
export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(SESSION_STORAGE_KEY)?.trim() ?? "";
}

export function persistVisitorContext(input: {
  profileId: string;
  sessionId?: string;
  unomiProfileId?: string;
}): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_STORAGE_KEY, input.profileId);
  if (input.sessionId?.trim()) {
    localStorage.setItem(SESSION_STORAGE_KEY, input.sessionId.trim());
  }
  if (input.unomiProfileId?.trim()) {
    localStorage.setItem(UNOMI_PROFILE_STORAGE_KEY, input.unomiProfileId.trim());
  }
}

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = getSessionId();
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_STORAGE_KEY, id);
  }
  return id;
}

/** Append sessionId query param for profile rehydration on serverless. */
export function withSessionQuery(url: string, sessionId?: string | null): string {
  const sid = (sessionId?.trim() || getSessionId()).trim();
  if (!sid) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}sessionId=${encodeURIComponent(sid)}`;
}
