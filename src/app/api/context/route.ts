import { NextResponse } from "next/server";
import type { TrafficSource } from "@/lib/types";
import {
  getCountryCodeFromRequest,
  regionFromCountryCode,
} from "@/lib/region";
import { isAppLocale } from "@/lib/i18n";
import { getDemoSessionFromRequest } from "@/lib/demo-request";
import { initContext } from "@/lib/unomi-client";

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

    const sessionId = body.sessionId?.trim();
    if (!sessionId) {
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
      sessionId,
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

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to initialize context" }, { status: 500 });
  }
}
