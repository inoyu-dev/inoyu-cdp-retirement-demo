import type { DemoSession } from "./demo-auth";
import { getUnomiScope, sendUnomiContextRequest } from "./unomi-config";

const SCOPE = getUnomiScope();

export async function sendDemoEventToUnomi(
  session: DemoSession,
  eventType: string,
  properties: Record<string, unknown>,
): Promise<void> {
  const result = await sendUnomiContextRequest(
    session.demoUserId,
    session.demoUserId,
    [
      {
        eventType,
        scope: SCOPE,
        properties: {
          ...properties,
          demoUserId: session.demoUserId,
          demoUsername: session.username,
          analyticsChannel: "demo_usage",
        },
        source: {
          itemId: "demo_platform",
          itemType: "page",
          scope: SCOPE,
        },
      },
    ],
  );

  if (!result.ok && process.env.UNOMI_DEBUG === "true") {
    console.warn("[unomi] demo telemetry failed:", result.error ?? result.status);
  }
}
