import { randomUUID } from "crypto";
import type { AppLocale, ContextResponse, TrafficSource, VisitorProfile, VisitorRegion } from "./types";
import { appendEvent, getProfile, listProfiles, upsertProfile } from "./local-store";
import { getQuizExperimentStore } from "./quiz-variant-store";
import { pickVariantId, resolveVariant } from "./quiz-variants";
import {
  getUnomiScope,
  isUnomiConfigured,
  sendUnomiContextRequest,
} from "./unomi-config";

const SCOPE = getUnomiScope();

async function sendToUnomi(
  sessionId: string,
  profileId: string | undefined,
  events: Array<Record<string, unknown>>,
  sourceItemId = "retirement_quiz",
): Promise<void> {
  if (!isUnomiConfigured()) return;

  const scopedEvents = events.map((event) => ({
    ...event,
    scope: SCOPE,
    source: {
      itemId: sourceItemId,
      itemType: "page",
      scope: SCOPE,
    },
  }));

  const result = await sendUnomiContextRequest(sessionId, profileId, scopedEvents, sourceItemId);
  if (!result.ok && process.env.UNOMI_DEBUG === "true") {
    console.warn("[unomi] context sync failed:", result.error ?? result.status);
  }
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
    });
  }

  const quizVariant = resolveVariant(profile.quizVariantId, experimentStore.variants);

  await trackEvent(profile.profileId, "view", {
    page: "retirement_quiz",
    trafficSource,
    utmCampaign,
    countryCode: profile.countryCode ?? geo?.countryCode,
    detectedRegion: profile.detectedRegion ?? geo?.detectedRegion,
    preferredLanguage: profile.preferredLanguage,
  });

  const refreshed = await getProfile(profile.profileId);
  return {
    profileId: profile.profileId,
    sessionId,
    profile: refreshed ?? profile,
    quizVariant,
    detectedRegion,
    countryCode: refreshed?.countryCode ?? profile.countryCode ?? geo?.countryCode,
  };
}

async function getProfileBySession(sessionId: string): Promise<VisitorProfile | null> {
  const { listProfiles } = await import("./local-store");
  const profiles = await listProfiles();
  return profiles.find((p) => p.sessionId === sessionId) ?? null;
}

export async function trackEvent(
  profileId: string,
  eventType: string,
  properties: Record<string, unknown>,
): Promise<VisitorProfile | null> {
  const profile = await getProfile(profileId);
  if (!profile) return null;

  await appendEvent(profileId, eventType, properties);

  await sendToUnomi(profile.sessionId, profileId, [
    {
      eventType: eventType === "view" ? "view" : eventType,
      properties,
    },
  ]);

  return getProfile(profileId);
}

export async function updateProfile(
  profileId: string,
  updates: Partial<VisitorProfile>,
): Promise<VisitorProfile | null> {
  const profile = await getProfile(profileId);
  if (!profile) return null;

  const merged: VisitorProfile = {
    ...profile,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await upsertProfile(merged);
  return merged;
}

export { getProfile, listProfiles, isUnomiConfigured, SCOPE };
