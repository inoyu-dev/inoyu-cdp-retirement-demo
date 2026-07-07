import { NextResponse } from "next/server";
import type { VisitorProfile } from "./types";
import { getProfile as getLocalProfile } from "./local-store";
import { getProfile } from "./unomi-client";
import { resolveVisitorContextIds } from "./visitor-context";

export function parseSessionId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export type ProfileWithSessionResult =
  | { status: "ok"; profile: VisitorProfile; sessionId: string; profileId: string }
  | { status: "missing_context" }
  | { status: "not_found" };

/** Load profile for a mutation; falls back to visitor context cookies when body omits ids. */
export async function loadProfileWithSession(
  profileId: unknown,
  sessionId: unknown,
): Promise<ProfileWithSessionResult> {
  const ctx = await resolveVisitorContextIds({ profileId, sessionId });
  if (!ctx.profileId || !ctx.sessionId) return { status: "missing_context" };
  const profile = await getProfile(ctx.profileId, ctx.sessionId);
  if (!profile) return { status: "not_found" };
  return { profile, sessionId: ctx.sessionId, profileId: ctx.profileId, status: "ok" };
}

export function profileAccessErrorResponse(
  result: Exclude<ProfileWithSessionResult, { status: "ok" }>,
) {
  if (result.status === "missing_context") {
    return NextResponse.json({ error: "profileId and sessionId required" }, { status: 400 });
  }
  return NextResponse.json({ error: "Profile not found" }, { status: 404 });
}

/** Read-only lookup: memory first, optional session rehydration, cookie fallbacks. */
export async function loadProfileForRead(
  profileId: unknown,
  sessionId?: unknown,
): Promise<VisitorProfile | null> {
  const ctx = await resolveVisitorContextIds({ profileId, sessionId });
  if (!ctx.profileId) return null;
  if (ctx.sessionId) {
    const hydrated = await getProfile(ctx.profileId, ctx.sessionId);
    if (hydrated) return hydrated;
  }
  return getLocalProfile(ctx.profileId);
}
