import { NextResponse } from "next/server";
import { getProfile, listProfiles } from "@/lib/unomi-client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get("profileId");

    if (profileId) {
      const profile = await getProfile(profileId);
      if (!profile) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }
      return NextResponse.json({ profile });
    }

    const profiles = await listProfiles();
    return NextResponse.json({ profiles });
  } catch {
    return NextResponse.json({ error: "Failed to load profiles" }, { status: 500 });
  }
}
