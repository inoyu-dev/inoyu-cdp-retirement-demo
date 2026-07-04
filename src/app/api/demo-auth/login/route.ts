import { NextResponse } from "next/server";
import { recordDemoLogin } from "@/lib/demo-analytics-store";
import {
  createDemoSessionToken,
  DEMO_SESSION_COOKIE,
  demoSessionCookieOptions,
  demoUserIdForUsername,
  validateDemoCredentials,
} from "@/lib/demo-auth";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { username?: string; password?: string };
    const username = body.username?.trim() ?? "";
    const password = body.password ?? "";

    if (!validateDemoCredentials(username, password)) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    const now = Date.now();
    const session = {
      username,
      demoUserId: demoUserIdForUsername(username),
      issuedAt: now,
      expiresAt: now + SESSION_TTL_MS,
    };

    await recordDemoLogin(session);
    const token = await createDemoSessionToken(username);

    const response = NextResponse.json({ ok: true, username, demoUserId: session.demoUserId });
    response.cookies.set(
      DEMO_SESSION_COOKIE,
      token,
      demoSessionCookieOptions(30 * 24 * 60 * 60),
    );
    return response;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
