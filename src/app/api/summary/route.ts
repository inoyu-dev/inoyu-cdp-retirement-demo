import { NextResponse } from "next/server";
import { generateAiSummary } from "@/lib/ai-summary";
import { getProfile } from "@/lib/unomi-client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get("profileId");

    if (!profileId) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }

    const profile = await getProfile(profileId);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const summary = await generateAiSummary(profile);
    return NextResponse.json({ summary });
  } catch {
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}
