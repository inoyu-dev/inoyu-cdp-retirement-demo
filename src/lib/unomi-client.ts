import { randomUUID } from "crypto";
import type { AppLocale, ContextResponse, TrafficSource, VisitorProfile, VisitorRegion } from "./types";
import {
  appendEvent,
  getProfile as getLocalProfile,
  listProfiles,
  upsertProfile,
} from "./local-store";
import { getQuizExperimentStore } from "./quiz-variant-store";
import { pickVariantId, resolveVariant } from "./quiz-variants";
import { parseSessionId } from "./profile-access";
import {
  getUnomiScope,
  isUnomiConfigured,
  sendUnomiContextRequest,
} from "./unomi-config";
import { UNOMI_SOURCE_VISITOR } from "./app-identity";
import { logId, logUnomiFailure, logDebug } from "./logger";
import { resolveUnomiContextProfileIdAsync } from "./visitor-context";

const SCOPE = getUnomiScope();

export function stampSessionId(
  properties: Record<string, unknown>,
  sessionId: string,
): Record<string, unknown> {
  return { ...properties, sessionId };
}

function resolveTrackingSessionId(profile: VisitorProfile, sessionId?: string): string {
  return parseSessionId(sessionId) ?? profile.sessionId;
}



function createProfileShell(profileId: string, sessionId: string): VisitorProfile {
  const now = new Date().toISOString();
  return {
    profileId,
    sessionId,
    createdAt: now,
    updatedAt: now,
    trafficSource: "direct",
    pageViews: 0,
    contentEngagement: {
      socialSecurityViews: 0,
      rolloverViews: 0,
      totalDwellSeconds: 0,
    },
    segments: [],
    leadScore: 0,
    events: [],
    smsThread: [],
    converted: false,
    quizChat: { messages: [] },
  };
}

/** Rehydrate a profile on a fresh serverless instance (Vercel in-memory store). */
async function ensureVisitorProfile(
  profileId: string,
  sessionId?: string,
): Promise<VisitorProfile | null> {
  const existing = await getLocalProfile(profileId);
  if (existing) return existing;

  const sid = sessionId?.trim();
  const { getVisitorProfileFromUnomi, getVisitorProfileBySessionFromUnomi } = await import(
    "./unomi-profile-store"
  );
  const remote =
    (await getVisitorProfileFromUnomi(profileId)) ??
    (sid ? await getVisitorProfileBySessionFromUnomi(sid) : null);
  if (remote) {
    await upsertProfile(remote);
    return remote;
  }

  if (!sid) return null;
  const shell = createProfileShell(profileId, sid);
  await upsertProfile(shell);
  return shell;
}

function stampDemoTesterOnProperties(
  profile: VisitorProfile | null,
  properties: Record<string, unknown>,
): Record<string, unknown> {
  if (!profile?.demoTesterId) return properties;
  return {
    ...properties,
    demoTesterId: profile.demoTesterId,
    demoTesterUsername: profile.demoTesterUsername,
    analyticsChannel: "demo_visitor_quiz",
  };
}

async function sendToUnomi(
  sessionId: string,
  profile: VisitorProfile | null | undefined,
  events: Array<Record<string, unknown>>,
  sourceItemId = UNOMI_SOURCE_VISITOR,
  localProfileId?: string,
): Promise<{ ok: boolean; profileId?: string; processedEvents?: number }> {
  if (!isUnomiConfigured()) return { ok: false };

  const scopedEvents = events.map((event) => ({
    ...event,
    scope: SCOPE,
    timeStamp: event.timeStamp ?? new Date().toISOString(),
    properties: stampDemoTesterOnProperties(
      profile ?? null,
      (event.properties as Record<string, unknown> | undefined) ?? {},
    ),
    source: {
      itemId: sourceItemId,
      itemType: "page",
      scope: SCOPE,
    },
  }));

  const profileProperties =
    profile?.demoTesterId && profile.demoTesterUsername
      ? {
          demoTesterId: profile.demoTesterId,
          demoTesterUsername: profile.demoTesterUsername,
          profileKind: "demo_visitor_session",
        }
      : undefined;

  const unomiContextProfileId = await resolveUnomiContextProfileIdAsync(
    profile,
    localProfileId ?? profile?.profileId,
  );

  const result = await sendUnomiContextRequest(
    sessionId,
    unomiContextProfileId,
    scopedEvents,
    sourceItemId,
    profileProperties,
  );
  if (!result.ok) {
    logUnomiFailure("sendToUnomi", {
      operation: "context sync",
      sessionId: logId(sessionId),
      localProfileId: logId(localProfileId ?? profile?.profileId),
      unomiContextProfileId: logId(unomiContextProfileId),
      sourceItemId,
      eventTypes: events.map((e) => String(e.eventType ?? "unknown")),
      status: result.status,
      error: result.error,
      processedEvents: result.processedEvents,
    });
  } else {
    logDebug("unomi", "context sync ok", {
      sessionId: logId(sessionId),
      returnedProfileId: logId(result.profileId),
      processedEvents: result.processedEvents,
    });
  }
  return {
    ok: result.ok,
    profileId: result.profileId,
    processedEvents: result.processedEvents,
  };
}

async function syncUnomiProfileId(
  localProfileId: string,
  unomiProfileId: string,
): Promise<void> {
  const profile = await getLocalProfile(localProfileId);
  if (!profile || profile.unomiProfileId === unomiProfileId) return;
  await upsertProfile({
    ...profile,
    unomiProfileId,
    updatedAt: new Date().toISOString(),
  });
}

export async function initContext(
  sessionId: string,
  trafficSource: TrafficSource,
  utmCampaign?: string,
  geo?: { countryCode?: string; detectedRegion: VisitorRegion },
  preferredLanguage?: AppLocale,
  demoTester?: { demoTesterId: string; demoTesterUsername: string },
): Promise<ContextResponse> {
  let profile = await getProfileBySession(sessionId);
  let shouldLinkDemoQuiz = false;

  if (!profile) {
    const profileId = randomUUID();
    const now = new Date().toISOString();
    profile = {
      profileId,
      sessionId,
      createdAt: now,
      updatedAt: now,
      trafficSource,
      utmCampaign,
      countryCode: geo?.countryCode,
      detectedRegion: geo?.detectedRegion,
      preferredLanguage: preferredLanguage ?? "en",
      pageViews: 0,
      contentEngagement: {
        socialSecurityViews: 0,
        rolloverViews: 0,
        totalDwellSeconds: 0,
      },
      segments: [],
      leadScore: 0,
      events: [],
      smsThread: [],
      converted: false,
      quizChat: { messages: [] },
      ...(demoTester
        ? {
            demoTesterId: demoTester.demoTesterId,
            demoTesterUsername: demoTester.demoTesterUsername,
            segments: [`demo_tester_${demoTester.demoTesterUsername.replace(/\s+/g, "_").toLowerCase()}`],
          }
        : {}),
    };
    await upsertProfile(profile);
    if (demoTester) shouldLinkDemoQuiz = true;
  } else {
    let changed = false;
    const next: VisitorProfile = { ...profile };
    if (geo && !profile.detectedRegion) {
      next.countryCode = geo.countryCode ?? profile.countryCode;
      next.detectedRegion = geo.detectedRegion;
      changed = true;
    }
    if (demoTester && !profile.demoTesterId) {
      next.demoTesterId = demoTester.demoTesterId;
      next.demoTesterUsername = demoTester.demoTesterUsername;
      const segment = `demo_tester_${demoTester.demoTesterUsername.replace(/\s+/g, "_").toLowerCase()}`;
      if (!next.segments.includes(segment)) {
        next.segments = [...next.segments, segment];
      }
      changed = true;
    }
    if (preferredLanguage && profile.preferredLanguage !== preferredLanguage) {
      next.preferredLanguage = preferredLanguage;
      changed = true;
      shouldLinkDemoQuiz = true;
    }
    if (changed) {
      next.updatedAt = new Date().toISOString();
      profile = next;
      await upsertProfile(profile);
    }
  }

  const detectedRegion = profile.detectedRegion ?? geo?.detectedRegion ?? "other";

  const experimentStore = await getQuizExperimentStore();
  if (!profile.quizVariantId) {
    profile.quizVariantId = pickVariantId(sessionId, experimentStore.experiment);
    profile.updatedAt = new Date().toISOString();
    await upsertProfile(profile);
    await trackEvent(profile.profileId, "quizVariantAssigned", {
      variantId: profile.quizVariantId,
      experimentId: experimentStore.experiment?.proposalId ?? null,
    }, sessionId);
  }

  const quizVariant = resolveVariant(profile.quizVariantId, experimentStore.variants);

  await trackEvent(profile.profileId, "view", {
    page: UNOMI_SOURCE_VISITOR,
    trafficSource,
    utmCampaign,
    countryCode: profile.countryCode ?? geo?.countryCode,
    detectedRegion: profile.detectedRegion ?? geo?.detectedRegion,
    preferredLanguage: profile.preferredLanguage,
  }, sessionId);

  const refreshed = (await getLocalProfile(profile.profileId)) ?? profile;

  if (shouldLinkDemoQuiz && demoTester) {
    const { sendDemoEventToUnomi } = await import("./demo-unomi");
    void sendDemoEventToUnomi(
      { demoUserId: demoTester.demoTesterId, username: demoTester.demoTesterUsername },
      "demoQuizSessionLinked",
      {
        visitorProfileId: profile.profileId,
        visitorSessionId: sessionId,
      },
    );
  }

  return {
    profileId: profile.profileId,
    unomiProfileId: refreshed.unomiProfileId,
    sessionId,
    profile: refreshed,
    quizVariant,
    detectedRegion,
    countryCode: refreshed.countryCode ?? profile.countryCode ?? geo?.countryCode,
  };
}

async function getProfileBySession(sessionId: string): Promise<VisitorProfile | null> {
  if (isUnomiConfigured()) {
    const { getVisitorProfileBySessionFromUnomi } = await import("./unomi-profile-store");
    const remote = await getVisitorProfileBySessionFromUnomi(sessionId);
    if (remote) {
      await upsertProfile(remote);
      return remote;
    }
  }

  const profiles = await listProfiles();
  return profiles.find((p) => p.sessionId === sessionId) ?? null;
}

export async function trackEvent(
  profileId: string,
  eventType: string,
  properties: Record<string, unknown>,
  sessionId?: string,
): Promise<VisitorProfile | null> {
  const profile = await ensureVisitorProfile(profileId, sessionId);
  if (!profile) return null;

  const sid = resolveTrackingSessionId(profile, sessionId);
  const stamped = stampSessionId(properties, sid);

  await appendEvent(profileId, eventType, stamped);

  const sync = await sendToUnomi(
    sid,
    profile,
    [
      {
        eventType: eventType === "view" ? "view" : eventType,
        properties: stamped,
      },
    ],
    UNOMI_SOURCE_VISITOR,
    profileId,
  );

  if (sync.profileId) {
    await syncUnomiProfileId(profileId, sync.profileId);
  }

  return getLocalProfile(profileId);
}

export async function trackEvents(
  profileId: string,
  events: Array<{ eventType: string; properties: Record<string, unknown> }>,
  sessionId?: string,
): Promise<VisitorProfile | null> {
  const profile = await ensureVisitorProfile(profileId, sessionId);
  if (!profile) return null;

  const sid = resolveTrackingSessionId(profile, sessionId);
  const stampedEvents = events.map((event) => ({
    eventType: event.eventType,
    properties: stampSessionId(event.properties, sid),
  }));

  for (const event of stampedEvents) {
    await appendEvent(profileId, event.eventType, event.properties);
  }

  if (stampedEvents.length > 0 && isUnomiConfigured()) {
    const sync = await sendToUnomi(
      sid,
      profile,
      stampedEvents.map((event) => ({
        eventType: event.eventType === "view" ? "view" : event.eventType,
        properties: event.properties,
      })),
      UNOMI_SOURCE_VISITOR,
      profileId,
    );
    if (sync.profileId) {
      await syncUnomiProfileId(profileId, sync.profileId);
    }
  }

  return getLocalProfile(profileId);
}

export async function sendChatEventsToUnomi(
  sessionId: string,
  profileId: string | undefined,
  events: Array<{ eventType: string; properties: Record<string, unknown> }>,
  sourceItemId = UNOMI_SOURCE_VISITOR,
): Promise<void> {
  if (!isUnomiConfigured() || events.length === 0) return;

  const profile = profileId ? await ensureVisitorProfile(profileId, sessionId) : null;

  const sync = await sendToUnomi(
    sessionId,
    profile,
    events.map((event) => ({
      eventType: event.eventType === "view" ? "view" : event.eventType,
      properties: stampSessionId(event.properties, sessionId),
    })),
    sourceItemId,
    profileId,
  );

  if (sync.profileId && profileId) {
    await syncUnomiProfileId(profileId, sync.profileId);
  }
}

export async function updateProfile(
  profileId: string,
  updates: Partial<VisitorProfile>,
  sessionId?: string,
): Promise<VisitorProfile | null> {
  const profile = await ensureVisitorProfile(profileId, sessionId);
  if (!profile) return null;

  const merged: VisitorProfile = {
    ...profile,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await upsertProfile(merged);
  return merged;
}

export async function getProfile(
  profileId: string,
  sessionId?: string,
): Promise<VisitorProfile | null> {
  return ensureVisitorProfile(profileId, sessionId);
}

export { listProfiles, isUnomiConfigured, SCOPE };
