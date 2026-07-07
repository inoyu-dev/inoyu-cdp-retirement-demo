import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import type { TrafficSource } from "@/lib/types";
import {
  getCountryCodeFromRequest,
  regionFromCountryCode,
} from "@/lib/region";
import { isAppLocale } from "@/lib/i18n";
import { getDemoSessionFromRequest } from "@/lib/demo-request";
import { initContext } from "@/lib/unomi-client";
import { jsonWithVisitorContext, resolveVisitorContextIds } from "@/lib/visitor-context";

function parseTrafficSource(utm?: string): TrafficSource {
  if (!utm) return "direct";
  const s = utm.toLowerCase();
  if (s.includes("meta") || s.includes("facebook") || s.includes("instagram")) {
    return "meta";
  }
  if (s.includes("taboola")) return "taboola";
  if (s.includes("google")) return "google";
  return "direct";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sessionId?: string;
      utm_source?: string;
      utm_campaign?: string;
      preferredLanguage?: string;
    };

    const ctx = await resolveVisitorContextIds({ sessionId: body.sessionId });
    if (!ctx.sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const trafficSource = parseTrafficSource(body.utm_source);
    const countryCode = getCountryCodeFromRequest(request);
    const detectedRegion = regionFromCountryCode(countryCode);
    const preferredLanguage =
      body.preferredLanguage && isAppLocale(body.preferredLanguage)
        ? body.preferredLanguage
        : undefined;
    const demoSession = await getDemoSessionFromRequest();
    const result = await initContext(
      ctx.sessionId,
      trafficSource,
      body.utm_campaign,
      {
        countryCode,
        detectedRegion,
      },
      preferredLanguage,
      demoSession
        ? { demoTesterId: demoSession.demoUserId, demoTesterUsername: demoSession.username }
        : undefined,
    );

    return jsonWithVisitorContext(result, result.profile ?? {
      profileId: result.profileId,
      sessionId: result.sessionId,
      unomiProfileId: result.unomiProfileId,
    });
  } catch (error) {
    return apiErrorResponse("context", "Failed to initialize context", error);
  }
}
