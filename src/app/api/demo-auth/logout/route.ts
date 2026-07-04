import { NextResponse } from "next/server";
import { recordDemoTelemetry } from "@/lib/demo-analytics-store";
import { DEMO_SESSION_COOKIE, demoSessionCookieOptions } from "@/lib/demo-auth";
import { getDemoSessionFromRequest } from "@/lib/demo-request";

export async function POST() {
  const session = await getDemoSessionFromRequest();
  if (session) {
    await recordDemoTelemetry(session, "demoLogout", {});
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(DEMO_SESSION_COOKIE, "", demoSessionCookieOptions(0));
  return response;
}
