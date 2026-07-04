import { NextResponse } from "next/server";
import { runDashboardUnomiAgent } from "@/lib/dashboard-unomi-agent";
import { getProfile } from "@/lib/unomi-client";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      message?: string;
      profileId?: string;
      history?: { role: "user" | "assistant"; content: string }[];
    };

    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const selectedProfile = body.profileId ? await getProfile(body.profileId) : null;

    const result = await runDashboardUnomiAgent({
      message,
      profileId: body.profileId,
      selectedProfile,
      history: body.history,
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Dashboard agent failed" }, { status: 500 });
  }
}
