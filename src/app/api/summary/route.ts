import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { buildTemplateSummary, generateAiSummary } from "@/lib/ai-summary";
import { isOpenAiConfigured } from "@/lib/openai-config";
import {
  getStoredSummary,
  saveProfileSummary,
} from "@/lib/profile-ai-artifacts";
import { loadProfileForRead } from "@/lib/profile-access";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceParam = searchParams.get("source");
    const source = sourceParam === "ai" ? "ai" : sourceParam === "stored" ? "stored" : "template";

    const profile = await loadProfileForRead(
      searchParams.get("profileId"),
      searchParams.get("sessionId"),
    );
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const aiAvailable = isOpenAiConfigured();
    const stored = getStoredSummary(profile);

    if (source === "stored") {
      if (!stored) {
        return NextResponse.json({ error: "No stored summary" }, { status: 404 });
      }
      return NextResponse.json({
        summary: stored.data,
        source: stored.source,
        aiAvailable,
        storedAt: stored.generatedAt,
      });
    }

    if (source === "template") {
      return NextResponse.json({
        summary: buildTemplateSummary(profile),
        source: "template" as const,
        aiAvailable,
        hasStoredAi: stored?.source === "ai",
      });
    }

    if (!aiAvailable) {
      return NextResponse.json({
        summary: buildTemplateSummary(profile),
        source: "template" as const,
        aiAvailable,
      });
    }

    const summary = await generateAiSummary(profile);
    await saveProfileSummary(profile.profileId, summary, "ai", profile.sessionId);

    return NextResponse.json({
      summary,
      source: "ai" as const,
      aiAvailable,
    });
  } catch (error) {
    return apiErrorResponse("summary", "Failed to generate summary", error);
  }
}
