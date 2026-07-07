import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type { DemoSession } from "./demo-auth";
import { getDataDir, isMemoryStore } from "./data-dir";
import { sendDemoEventToUnomi } from "./demo-unomi";

const DATA_DIR = getDataDir();
const STORE_FILE = path.join(DATA_DIR, "demo-analytics.json");

export interface DemoUserAnalytics {
  demoUserId: string;
  username: string;
  firstSeenAt: string;
  lastSeenAt: string;
  loginCount: number;
  sessionCount: number;
  returnVisitCount: number;
  totalPageViews: number;
  totalDwellSeconds: number;
  totalMouseMoves: number;
  totalClicks: number;
  pagesVisited: Record<string, number>;
  lastPath?: string;
  events: Array<{
    id: string;
    eventType: string;
    timestamp: string;
    properties: Record<string, unknown>;
  }>;
}

interface DemoAnalyticsStore {
  users: Record<string, DemoUserAnalytics>;
}

let memoryStore: DemoAnalyticsStore = { users: {} };

async function readStore(): Promise<DemoAnalyticsStore> {
  if (isMemoryStore()) {
    return memoryStore;
  }

  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    return JSON.parse(await fs.readFile(STORE_FILE, "utf8")) as DemoAnalyticsStore;
  } catch {
    return { users: {} };
  }
}

async function writeStore(store: DemoAnalyticsStore): Promise<void> {
  if (isMemoryStore()) {
    memoryStore = store;
    return;
  }
  await fs.writeFile(STORE_FILE, JSON.stringify(store, null, 2));
}

function ensureUser(store: DemoAnalyticsStore, session: DemoSession): DemoUserAnalytics {
  const existing = store.users[session.demoUserId];
  if (existing) return existing;
  const now = new Date().toISOString();
  const created: DemoUserAnalytics = {
    demoUserId: session.demoUserId,
    username: session.username,
    firstSeenAt: now,
    lastSeenAt: now,
    loginCount: 0,
    sessionCount: 0,
    returnVisitCount: 0,
    totalPageViews: 0,
    totalDwellSeconds: 0,
    totalMouseMoves: 0,
    totalClicks: 0,
    pagesVisited: {},
    events: [],
  };
  store.users[session.demoUserId] = created;
  return created;
}

export async function recordDemoLogin(session: DemoSession): Promise<DemoUserAnalytics> {
  const store = await readStore();
  const user = ensureUser(store, session);
  const now = new Date().toISOString();
  const isReturn = user.loginCount > 0;
  user.username = session.username;
  user.lastSeenAt = now;
  user.loginCount += 1;
  if (isReturn) user.returnVisitCount += 1;
  await appendDemoEvent(store, user, "demoLogin", {
    username: session.username,
    loginCount: user.loginCount,
    returnVisit: isReturn,
  });
  await writeStore(store);
  await sendDemoEventToUnomi(session, "demoLogin", {
    username: session.username,
    loginCount: user.loginCount,
    returnVisit: isReturn,
  });
  return user;
}

export async function recordDemoTelemetry(
  session: DemoSession,
  eventType: string,
  properties: Record<string, unknown>,
): Promise<void> {
  const store = await readStore();
  const user = ensureUser(store, session);
  user.lastSeenAt = new Date().toISOString();

  if (eventType === "demoSessionStart") {
    user.sessionCount += 1;
  }
  if (eventType === "demoPageView") {
    user.totalPageViews += 1;
    const path = String(properties.path ?? "/");
    user.pagesVisited[path] = (user.pagesVisited[path] ?? 0) + 1;
    user.lastPath = path;
  }
  if (eventType === "demoPageDwell") {
    user.totalDwellSeconds += Number(properties.seconds ?? 0);
  }
  if (eventType === "demoMouseActivity") {
    user.totalMouseMoves += Number(properties.moveCount ?? 0);
    user.totalClicks += Number(properties.clickCount ?? 0);
  }

  await appendDemoEvent(store, user, eventType, properties);
  await writeStore(store);
  await sendDemoEventToUnomi(session, eventType, properties);
}

async function appendDemoEvent(
  store: DemoAnalyticsStore,
  user: DemoUserAnalytics,
  eventType: string,
  properties: Record<string, unknown>,
): Promise<void> {
  user.events.unshift({
    id: randomUUID(),
    eventType,
    timestamp: new Date().toISOString(),
    properties,
  });
  user.events = user.events.slice(0, 300);
  store.users[user.demoUserId] = user;
}

export async function listDemoUserAnalytics(): Promise<DemoUserAnalytics[]> {
  const store = await readStore();
  return Object.values(store.users).sort(
    (a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime(),
  );
}
