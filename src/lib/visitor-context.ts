import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { VisitorProfile } from "./types";
import {
  UNOMI_PROFILE_COOKIE,
  VISITOR_PROFILE_COOKIE,
  VISITOR_SESSION_COOKIE,
} from "./app-identity";
import { parseSessionId } from "./profile-access";
import { resolveUnomiContextProfileId } from "./unomi-profile-id";

export { resolveUnomiContextProfileId, UNOMI_PROFILE_COOKIE, VISITOR_PROFILE_COOKIE, VISITOR_SESSION_COOKIE };

const VISITOR_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

export interface VisitorContextIds {
  sessionId: string | null;
  profileId: string | null;
  unomiProfileId: string | null;
}

export function visitorContextCookieOptions(maxAge = VISITOR_COOKIE_MAX_AGE) {
  const secure =
    process.env.DEMO_COOKIE_SECURE === "false" ? false : process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function getVisitorContextFromCookies(): Promise<VisitorContextIds> {
  const jar = await cookies();
  return {
    sessionId: parseSessionId(jar.get(VISITOR_SESSION_COOKIE)?.value),
    profileId: jar.get(VISITOR_PROFILE_COOKIE)?.value?.trim() || null,
    unomiProfileId: jar.get(UNOMI_PROFILE_COOKIE)?.value?.trim() || null,
  };
}

export async function resolveVisitorContextIds(input: {
  sessionId?: unknown;
  profileId?: unknown;
}): Promise<VisitorContextIds> {
  const fromCookies = await getVisitorContextFromCookies();
  return {
    sessionId: parseSessionId(input.sessionId) ?? fromCookies.sessionId,
    profileId:
      (typeof input.profileId === "string" ? input.profileId.trim() : "") ||
      fromCookies.profileId,
    unomiProfileId: fromCookies.unomiProfileId,
  };
}

export function attachVisitorContextCookies(
  response: NextResponse,
  profile: Pick<VisitorProfile, "profileId" | "sessionId" | "unomiProfileId"> | null | undefined,
): NextResponse {
  if (!profile?.profileId || !profile.sessionId) return response;

  const opts = visitorContextCookieOptions();
  response.cookies.set(VISITOR_SESSION_COOKIE, profile.sessionId, opts);
  response.cookies.set(VISITOR_PROFILE_COOKIE, profile.profileId, opts);
  if (profile.unomiProfileId?.trim()) {
    response.cookies.set(UNOMI_PROFILE_COOKIE, profile.unomiProfileId.trim(), opts);
  }
  return response;
}

export function jsonWithVisitorContext(
  data: unknown,
  profile: Pick<VisitorProfile, "profileId" | "sessionId" | "unomiProfileId"> | null | undefined,
  init?: ResponseInit,
): NextResponse {
  const response = NextResponse.json(data, init);
  return attachVisitorContextCookies(response, profile);
}

/** Prefer stored Unomi id, then httpOnly cookie, then app profile id. */
export async function resolveUnomiContextProfileIdAsync(
  profile: Pick<VisitorProfile, "profileId" | "unomiProfileId"> | null | undefined,
  fallbackProfileId?: string,
): Promise<string | undefined> {
  const fromProfile = resolveUnomiContextProfileId(profile, fallbackProfileId);
  if (profile?.unomiProfileId?.trim()) return fromProfile;

  const ctx = await getVisitorContextFromCookies();
  return ctx.unomiProfileId ?? fromProfile ?? ctx.profileId ?? undefined;
}
