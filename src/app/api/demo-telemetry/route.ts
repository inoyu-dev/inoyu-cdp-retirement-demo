import { NextResponse } from "next/server";
import { recordDemoTelemetry } from "@/lib/demo-analytics-store";
import { getDemoSessionFromRequest } from "@/lib/demo-request";

const ALLOWED_EVENTS = new Set([
  "demoSessionStart",
  "demoPageView",
  "demoPageDwell",
  "demoMouseActivity",
  "demoSessionHeartbeat",
]);

export async function POST(request: Request) {
  try {
    const session = await getDemoSessionFromRequest();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      eventType?: string;
      properties?: Record<string, unknown>;
    };

    const eventType = body.eventType ?? "";
    if (!ALLOWED_EVENTS.has(eventType)) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }

    await recordDemoTelemetry(session, eventType, body.properties ?? {});
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Telemetry failed" }, { status: 500 });
  }
}
