import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { loadProfileForRead } from "@/lib/profile-access";
import { listProfiles } from "@/lib/unomi-client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const profileIdQuery = searchParams.get("profileId");

    // List endpoint must ignore visitor cookies; only resolve context when fetching one profile.
    if (profileIdQuery !== null) {
      const profile = await loadProfileForRead(profileIdQuery, searchParams.get("sessionId"));
      if (!profile) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }
      return NextResponse.json({ profile });
    }

    const profiles = await listProfiles();
    return NextResponse.json({ profiles });
  } catch (error) {
    return apiErrorResponse("profile", "Failed to load profiles", error);
  }
}
