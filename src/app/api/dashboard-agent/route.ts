import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { dashboardAgentMessageProperties } from "@/lib/chat-unomi-events";
import { runDashboardUnomiAgent } from "@/lib/dashboard-unomi-agent";
import { getDemoSessionFromRequest } from "@/lib/demo-request";
import { loadProfileForRead } from "@/lib/profile-access";
import {
  sendChatEventsToUnomi,
  trackEvents,
} from "@/lib/unomi-client";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      message?: string;
      profileId?: string;
      sessionId?: string;
      history?: { role: "user" | "assistant"; content: string }[];
    };

    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const selectedProfile = body.profileId
      ? await loadProfileForRead(body.profileId, body.sessionId)
      : null;
    const demoSession = await getDemoSessionFromRequest();
    const marketerSessionId = `marketer-${demoSession?.demoUserId ?? "anonymous"}`;
    const sessionId = selectedProfile?.sessionId ?? marketerSessionId;

    const userEvent = {
      eventType: "dashboardAgentMessage",
      properties: dashboardAgentMessageProperties("user", message, {
        focusProfileId: body.profileId ?? null,
      }),
    };

    if (selectedProfile) {
      await trackEvents(selectedProfile.profileId, [userEvent], sessionId);
    } else {
      await sendChatEventsToUnomi(marketerSessionId, undefined, [userEvent], "dashboard_agent");
    }

    const result = await runDashboardUnomiAgent({
      message,
      profileId: body.profileId,
      selectedProfile,
      history: body.history,
    });

    const assistantEvent = {
      eventType: "dashboardAgentMessage",
      properties: dashboardAgentMessageProperties("assistant", result.reply, {
        focusProfileId: body.profileId ?? null,
        toolsUsed: result.toolsUsed,
        dataSource: result.dataSource,
      }),
    };

    if (selectedProfile) {
      await trackEvents(selectedProfile.profileId, [assistantEvent], sessionId);
    } else {
      await sendChatEventsToUnomi(sessionId, undefined, [assistantEvent], "dashboard_agent");
    }

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse("dashboard-agent", "Dashboard agent failed", error);
  }
}
