import { randomUUID } from "node:crypto";
import {
  UNOMI_PROFILE_COOKIE,
  VISITOR_PROFILE_COOKIE,
  VISITOR_SESSION_COOKIE,
  DEMO_PASSWORD_DEFAULT,
} from "../../../scripts/app-identity.mjs";
import { getTestBaseUrl } from "./server.mjs";

export function demoPassword() {
  return process.env.DEMO_PASSWORD || DEMO_PASSWORD_DEFAULT;
}

export function parseSetCookie(headers) {
  const raw =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : [headers.get("set-cookie")].filter(Boolean);
  return raw.map((entry) => entry.split(";")[0]).join("; ");
}

/** Parse Set-Cookie headers into a name → value map. */
export function parseAllSetCookies(headers) {
  const raw =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : [headers.get("set-cookie")].filter(Boolean);
  const map = {};
  for (const entry of raw) {
    const [pair] = entry.split(";");
    const idx = pair.indexOf("=");
    if (idx > 0) {
      map[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
    }
  }
  return map;
}

/** Merge multiple `Cookie` header strings; later values win. */
export function mergeCookies(...parts) {
  const map = {};
  for (const part of parts.filter(Boolean)) {
    for (const chunk of part.split(";")) {
      const c = chunk.trim();
      if (!c) continue;
      const idx = c.indexOf("=");
      if (idx > 0) map[c.slice(0, idx).trim()] = c.slice(idx + 1).trim();
    }
  }
  return Object.entries(map)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

const VISITOR_COOKIE_NAMES = [
  VISITOR_SESSION_COOKIE,
  VISITOR_PROFILE_COOKIE,
  UNOMI_PROFILE_COOKIE,
];

export function visitorCookiesFromHeaders(headers) {
  const all = parseAllSetCookies(headers);
  return VISITOR_COOKIE_NAMES.filter((name) => all[name])
    .map((name) => `${name}=${all[name]}`)
    .join("; ");
}

export async function loginDemo(username = "Integration Tester") {
  const res = await fetch(`${getTestBaseUrl()}/api/demo-auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password: demoPassword() }),
  });
  const data = await res.json().catch(() => ({}));
  return {
    ok: res.ok,
    status: res.status,
    cookie: parseSetCookie(res.headers),
    data,
  };
}

export async function apiFetch(path, { method = "GET", body, cookie } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (cookie) headers.Cookie = cookie;

  const res = await fetch(`${getTestBaseUrl()}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 300) };
  }

  return { ok: res.ok, status: res.status, json, headers: res.headers };
}

export function newSessionId() {
  return randomUUID();
}

export function sampleQuizAnswers(overrides = {}) {
  return {
    firstName: "Michael",
    age: 58,
    retireYears: 6,
    currentSavings: "100k_500k",
    primaryConcern: "social_security",
    email: "michael.integration@example.com",
    contactChannel: "email",
    contactRegion: "us",
    ...overrides,
  };
}

export async function initVisitorContext(cookie, sessionId = newSessionId()) {
  const res = await apiFetch("/api/context", {
    method: "POST",
    cookie,
    body: {
      sessionId,
      utm_source: "meta",
      utm_campaign: "integration-test",
      preferredLanguage: "en",
    },
  });
  const visitorCookie = visitorCookiesFromHeaders(res.headers);
  return {
    ...res,
    sessionId,
    visitorCookie,
    cookie: mergeCookies(cookie, visitorCookie),
  };
}
