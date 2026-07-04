/**
 * Shared Apache Unomi connection settings for remote server deployments.
 * All server-side Unomi calls should go through this module.
 */

export type UnomiVersion = "v2" | "v3";

export interface UnomiHealthResult {
  configured: boolean;
  ok: boolean;
  message: string;
  latencyMs?: number;
  scope?: string;
  baseUrl?: string;
  contextOk?: boolean;
  adminOk?: boolean;
}

function trimUrl(url?: string): string | null {
  const value = url?.trim();
  if (!value) return null;
  return value.replace(/\/+$/, "");
}

export function getUnomiBaseUrl(): string | null {
  return trimUrl(process.env.UNOMI_BASE_URL);
}

export function isUnomiConfigured(): boolean {
  return Boolean(getUnomiBaseUrl());
}

export function getUnomiScope(): string {
  return process.env.UNOMI_SCOPE ?? "itstoday";
}

export function getUnomiVersion(): UnomiVersion {
  return (process.env.UNOMI_VERSION ?? "v2").toLowerCase() === "v3" ? "v3" : "v2";
}

function basicAuthHeader(user: string, pass: string): string {
  return `Basic ${Buffer.from(`${user}:${pass}`, "utf8").toString("base64")}`;
}

function adminCredentials(): { user: string; pass: string } {
  return {
    user: process.env.UNOMI_USERNAME ?? "karaf",
    pass: process.env.UNOMI_PASSWORD ?? "karaf",
  };
}

function healthCredentials(): { user: string; pass: string } {
  return {
    user: process.env.UNOMI_HEALTH_USERNAME ?? process.env.UNOMI_USERNAME ?? "karaf",
    pass: process.env.UNOMI_HEALTH_PASSWORD ?? process.env.UNOMI_PASSWORD ?? "karaf",
  };
}

export function unomiAdminHeaders(): Record<string, string> {
  const { user, pass } = adminCredentials();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: basicAuthHeader(user, pass),
  };
  if (getUnomiVersion() === "v3" && process.env.UNOMI_TENANT_PUBLIC_TOKEN) {
    headers["X-Unomi-Api-Key"] = process.env.UNOMI_TENANT_PUBLIC_TOKEN;
  }
  return headers;
}

export function unomiContextHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (getUnomiVersion() === "v3" && process.env.UNOMI_TENANT_PUBLIC_TOKEN) {
    headers["X-Unomi-Api-Key"] = process.env.UNOMI_TENANT_PUBLIC_TOKEN;
  }

  const useAdminAuth = process.env.UNOMI_CONTEXT_USE_ADMIN_AUTH !== "false";
  if (useAdminAuth) {
    const { user, pass } = adminCredentials();
    headers.Authorization = basicAuthHeader(user, pass);
  }

  return headers;
}

export async function unomiAdminFetch(
  path: string,
  init?: RequestInit,
): Promise<Response | null> {
  const baseUrl = getUnomiBaseUrl();
  if (!baseUrl) return null;
  try {
    return await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        ...unomiAdminHeaders(),
        ...(init?.headers as Record<string, string> | undefined),
      },
    });
  } catch {
    return null;
  }
}

export async function unomiContextFetch(
  path: string,
  init?: RequestInit,
): Promise<Response | null> {
  const baseUrl = getUnomiBaseUrl();
  if (!baseUrl) return null;
  try {
    return await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        ...unomiContextHeaders(),
        ...(init?.headers as Record<string, string> | undefined),
      },
    });
  } catch {
    return null;
  }
}

export async function sendUnomiContextRequest(
  sessionId: string,
  profileId: string | undefined,
  events: Array<Record<string, unknown>>,
  sourceItemId = "retirement_quiz",
): Promise<{ ok: boolean; status?: number; error?: string }> {
  if (!isUnomiConfigured()) return { ok: false, error: "not configured" };

  const payload: Record<string, unknown> = {
    source: {
      itemId: sourceItemId,
      itemType: "page",
      scope: getUnomiScope(),
    },
    requiredProfileProperties: ["*"],
    requireSegments: true,
    requireScores: true,
    events,
  };

  if (profileId) payload.profileId = profileId;

  const res = await unomiContextFetch(
    `/cxs/context.json?sessionId=${encodeURIComponent(sessionId)}`,
    { method: "POST", body: JSON.stringify(payload) },
  );

  if (!res) return { ok: false, error: "network error" };
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, status: res.status, error: body.slice(0, 200) || res.statusText };
  }
  return { ok: true, status: res.status };
}

async function probeAdminApi(): Promise<{ ok: boolean; message: string }> {
  const res = await unomiAdminFetch("/cxs/profiles/count");
  if (!res) return { ok: false, message: "Admin API unreachable" };
  if (res.ok) return { ok: true, message: "Admin API connected" };
  if (res.status === 401 || res.status === 403) {
    return { ok: false, message: `Admin API auth failed (${res.status})` };
  }
  return { ok: false, message: `Admin API error (${res.status})` };
}

async function probeContextApi(): Promise<{ ok: boolean; message: string }> {
  const probeSession = "integration-health-probe";
  const res = await unomiContextFetch(
    `/cxs/context.json?sessionId=${encodeURIComponent(probeSession)}`,
    {
      method: "POST",
      body: JSON.stringify({
        source: { itemId: "integration_probe", itemType: "page", scope: getUnomiScope() },
        events: [],
      }),
    },
  );
  if (!res) return { ok: false, message: "Context API unreachable" };
  if (res.ok) return { ok: true, message: "Context API connected" };
  if (res.status === 401 || res.status === 403) {
    return { ok: false, message: `Context API auth failed (${res.status})` };
  }
  return { ok: false, message: `Context API error (${res.status})` };
}

async function probeHealthEndpoint(): Promise<{ ok: boolean; message: string }> {
  const baseUrl = getUnomiBaseUrl();
  if (!baseUrl) return { ok: false, message: "not configured" };
  const { user, pass } = healthCredentials();
  try {
    const res = await fetch(`${baseUrl}/health/check`, {
      headers: {
        Accept: "application/json",
        Authorization: basicAuthHeader(user, pass),
      },
    });
    if (!res.ok) return { ok: false, message: `/health/check returned ${res.status}` };
    const data = (await res.json()) as Array<{ name?: string; status?: string }>;
    const unomi = data.find((item) => item.name === "unomi");
    if (unomi?.status === "LIVE") return { ok: true, message: "Unomi cluster LIVE" };
    return { ok: true, message: "Health endpoint reachable" };
  } catch {
    return { ok: false, message: "Health endpoint unreachable" };
  }
}

export async function checkUnomiHealth(): Promise<UnomiHealthResult> {
  const baseUrl = getUnomiBaseUrl();
  if (!baseUrl) {
    return { configured: false, ok: false, message: "UNOMI_BASE_URL not set — using local JSON store" };
  }

  const started = Date.now();
  const [health, admin, context] = await Promise.all([
    probeHealthEndpoint(),
    probeAdminApi(),
    probeContextApi(),
  ]);
  const latencyMs = Date.now() - started;
  const ok = admin.ok && context.ok;

  const message = ok
    ? `Connected to ${baseUrl} (scope: ${getUnomiScope()})`
    : [admin.message, context.message, health.message].filter(Boolean).join(" · ");

  return {
    configured: true,
    ok,
    message,
    latencyMs,
    scope: getUnomiScope(),
    baseUrl,
    adminOk: admin.ok,
    contextOk: context.ok,
  };
}
