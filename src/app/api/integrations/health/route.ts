import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { getIntegrationsHealth } from "@/lib/integrations-health";

export async function GET() {
  try {
    const health = await getIntegrationsHealth();
    return NextResponse.json(health);
  } catch (error) {
    return apiErrorResponse("integrations/health", "Health check failed", error);
  }
}
