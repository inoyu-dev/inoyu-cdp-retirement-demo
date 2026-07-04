import { NextResponse, type NextRequest } from "next/server";
import {
  DEMO_SESSION_COOKIE,
  isPublicDemoPath,
  verifyDemoSessionToken,
} from "@/lib/demo-auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicDemoPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(DEMO_SESSION_COOKIE)?.value;
  const session = await verifyDemoSessionToken(token);

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
