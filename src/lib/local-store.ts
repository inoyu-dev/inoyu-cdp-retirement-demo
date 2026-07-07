import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { getDataDir, isMemoryStore } from "./data-dir";
import { resolveUnomiScope } from "./app-identity";
import { isUnomiConfigured } from "./unomi-config";
import {
  getVisitorProfileFromUnomi,
  listVisitorProfilesFromUnomi,
  syncVisitorProfileToUnomi,
} from "./unomi-profile-store";
import { applyFunnelEvent } from "./quiz-funnel";
import { rollupQuizEngagement, type StepEngagementPayload } from "./quiz-engagement";
import type { UnomiEvent, VisitorProfile } from "./types";
import type { QuizStepId } from "./quiz-flow";

const DATA_DIR = getDataDir();
const STORE_FILE = path.join(DATA_DIR, "profiles.json");

interface StoreData {
  profiles: Record<string, VisitorProfile>;
}

let memoryStore: StoreData = { profiles: {} };

function isUnomiProfileStoreEnabled(): boolean {
  return isMemoryStore() && isUnomiConfigured();
}

async function persistProfile(profile: VisitorProfile): Promise<void> {
  if (isUnomiProfileStoreEnabled()) {
    await syncVisitorProfileToUnomi(profile);
  }
}

async function ensureStore(): Promise<StoreData> {
  if (isMemoryStore()) {
    return memoryStore;
  }

  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(STORE_FILE, "utf-8");
    return JSON.parse(raw) as StoreData;
  } catch {
    const empty: StoreData = { profiles: {} };
    await fs.writeFile(STORE_FILE, JSON.stringify(empty, null, 2));
    return empty;
  }
}

async function saveStore(data: StoreData): Promise<void> {
  if (isMemoryStore()) {
    memoryStore = data;
    return;
  }
  await fs.writeFile(STORE_FILE, JSON.stringify(data, null, 2));
}

export async function getProfile(profileId: string): Promise<VisitorProfile | null> {
  const store = await ensureStore();
  const local = store.profiles[profileId];
  if (local) return local;
  if (isUnomiProfileStoreEnabled()) {
    return getVisitorProfileFromUnomi(profileId);
  }
  return null;
}

export async function listProfiles(): Promise<VisitorProfile[]> {
  if (isUnomiProfileStoreEnabled()) {
    return listVisitorProfilesFromUnomi();
  }
  const store = await ensureStore();
  return Object.values(store.profiles).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export async function upsertProfile(profile: VisitorProfile): Promise<VisitorProfile> {
  const store = await ensureStore();
  store.profiles[profile.profileId] = profile;
  await saveStore(store);
  await persistProfile(profile);
  return profile;
}

export function createEvent(
  eventType: string,
  properties: Record<string, unknown>,
): UnomiEvent {
  return {
    id: randomUUID(),
    eventType,
    timestamp: new Date().toISOString(),
    scope: resolveUnomiScope(),
    properties,
  };
}

export async function appendEvent(
  profileId: string,
  eventType: string,
  properties: Record<string, unknown>,
): Promise<VisitorProfile | null> {
  const profile = await getProfile(profileId);
  if (!profile) return null;

  const event = createEvent(eventType, properties);
  profile.events.unshift(event);
  profile.updatedAt = new Date().toISOString();

  if (eventType === "view") {
    profile.pageViews += 1;
  }

  if (eventType === "contentEngagement") {
    const topic = properties.topic as string | undefined;
    if (topic === "social_security") {
      profile.contentEngagement.socialSecurityViews += 1;
    }
    if (topic === "401k_rollover") {
      profile.contentEngagement.rolloverViews += 1;
    }
    const dwell = Number(properties.dwellSeconds ?? 0);
    profile.contentEngagement.totalDwellSeconds += dwell;
  }

  if (eventType === "quizStepEngagement") {
    const payload = properties as unknown as StepEngagementPayload;
    if (typeof payload.step === "number") {
      profile.quizEngagement = rollupQuizEngagement(profile.quizEngagement, {
        ...payload,
        step: payload.step as QuizStepId,
      });
    }
  }

  if (eventType === "quizEngagementSummary" && properties.rollup) {
    profile.quizEngagement = properties.rollup as VisitorProfile["quizEngagement"];
  }

  if (
    eventType === "quizStepView" ||
    eventType === "quizStepEngagement" ||
    eventType === "quizCompleted"
  ) {
    profile.quizFunnel = applyFunnelEvent(profile, eventType, properties);
  }

  await upsertProfile(profile);
  return profile;
}
