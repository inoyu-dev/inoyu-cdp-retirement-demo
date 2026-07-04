import { cookies } from "next/headers";
import { DEMO_SESSION_COOKIE, verifyDemoSessionToken, type DemoSession } from "./demo-auth";

export async function getDemoSessionFromRequest(): Promise<DemoSession | null> {
  const jar = await cookies();
  const token = jar.get(DEMO_SESSION_COOKIE)?.value;
  return verifyDemoSessionToken(token);
}
