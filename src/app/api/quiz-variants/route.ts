import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { getVariantDashboardPayload } from "@/lib/quiz-variant-store";

export async function GET() {
  try {
    const payload = await getVariantDashboardPayload();
    return NextResponse.json(payload);
  } catch (error) {
    return apiErrorResponse("quiz-variants", "Failed to load quiz variants", error);
  }
}
