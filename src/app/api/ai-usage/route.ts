import { NextResponse } from "next/server";
import { getAiUsageSnapshot } from "@/lib/ai-usage-store";

export async function GET() {
  try {
    const usage = await getAiUsageSnapshot();
    return NextResponse.json(usage);
  } catch {
    return NextResponse.json({ error: "Failed to load AI usage" }, { status: 500 });
  }
}
