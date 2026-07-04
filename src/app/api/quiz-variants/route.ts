import { NextResponse } from "next/server";
import { getVariantDashboardPayload } from "@/lib/quiz-variant-store";

export async function GET() {
  try {
    const payload = await getVariantDashboardPayload();
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "Failed to load quiz variants" }, { status: 500 });
  }
}
