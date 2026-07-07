import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { listDemoUserAnalytics } from "@/lib/demo-analytics-store";
import { searchDemoTesterProfiles } from "@/lib/demo-unomi";
import { getDemoSessionFromRequest } from "@/lib/demo-request";
import { getIntegrationsHealth } from "@/lib/integrations-health";
import { isUnomiConfigured } from "@/lib/unomi-config";

export async function GET() {
  try {
    const session = await getDemoSessionFromRequest();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [users, health, unomiProfiles] = await Promise.all([
      listDemoUserAnalytics(),
      getIntegrationsHealth(),
      searchDemoTesterProfiles(50),
    ]);

    return NextResponse.json({
      checkedAt: new Date().toISOString(),
      unomiConfigured: isUnomiConfigured(),
      unomiConnected: health.unomi.ok,
      showcaseMode: health.showcaseMode,
      users,
      unomiDemoProfiles: unomiProfiles.profiles,
      unomiDemoProfileCount: unomiProfiles.totalSize,
      unomiSearchOk: unomiProfiles.ok,
    });
  } catch (error) {
    return apiErrorResponse("demo-analytics", "Failed to load demo analytics", error);
  }
}
