export const DEMO_SESSION_COOKIE = "itstoday_demo_session";
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "itsmedia";
const DEMO_AUTH_SECRET = process.env.DEMO_AUTH_SECRET ?? "itstoday-demo-dev-secret";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface DemoSession {
  username: string;
  demoUserId: string;
  issuedAt: number;
  expiresAt: number;
}

function encoder(): TextEncoder {
  return new TextEncoder();
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(padLen);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function demoUserIdForUsername(username: string): string {
  const normalized = username.trim().toLowerCase();
  let hash = 5381;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 33) ^ normalized.charCodeAt(i);
  }
  return `demo-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function validateDemoCredentials(username: string, password: string): boolean {
  const name = username.trim();
  if (name.length < 2 || name.length > 64) return false;
  return password === DEMO_PASSWORD;
}

export async function createDemoSessionToken(username: string): Promise<string> {
  const now = Date.now();
  const session: DemoSession = {
    username: username.trim(),
    demoUserId: demoUserIdForUsername(username),
    issuedAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };
  const payload = bytesToBase64Url(encoder().encode(JSON.stringify(session)));
  const key = await hmacKey(DEMO_AUTH_SECRET);
  const signature = await crypto.subtle.sign("HMAC", key, encoder().encode(payload));
  return `${payload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifyDemoSessionToken(token: string | undefined): Promise<DemoSession | null> {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  try {
    const key = await hmacKey(DEMO_AUTH_SECRET);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToBytes(signature) as BufferSource,
      encoder().encode(payload),
    );
    if (!valid) return null;
    const session = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))) as DemoSession;
    if (!session.username || !session.demoUserId || !session.expiresAt) return null;
    if (Date.now() > session.expiresAt) return null;
    return session;
  } catch {
    return null;
  }
}

export function demoSessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function isPublicDemoPath(pathname: string): boolean {
  if (pathname === "/login") return true;
  if (pathname.startsWith("/api/demo-auth/login")) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname === "/favicon.ico") return true;
  if (/\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)) return true;
  return false;
}
