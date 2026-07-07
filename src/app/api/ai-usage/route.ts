import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { getAiUsageSnapshot } from "@/lib/ai-usage-store";

export async function GET() {
  try {
    const usage = await getAiUsageSnapshot();
    return NextResponse.json(usage);
  } catch (error) {
    return apiErrorResponse("ai-usage", "Failed to load AI usage", error);
  }
}
