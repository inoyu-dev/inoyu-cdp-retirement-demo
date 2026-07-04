import { NextResponse } from "next/server";
import { getDemoSessionFromRequest } from "@/lib/demo-request";

export async function GET() {
  const session = await getDemoSessionFromRequest();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    username: session.username,
    demoUserId: session.demoUserId,
  });
}
