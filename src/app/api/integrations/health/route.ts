import { NextResponse } from "next/server";
import { getIntegrationsHealth } from "@/lib/integrations-health";

export async function GET() {
  try {
    const health = await getIntegrationsHealth();
    return NextResponse.json(health);
  } catch {
    return NextResponse.json({ error: "Health check failed" }, { status: 500 });
  }
}
