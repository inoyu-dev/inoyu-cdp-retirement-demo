import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { buildTemplateSummary, generateAiSummary } from "@/lib/ai-summary";
import { createEvent } from "@/lib/local-store";
import {
  buildInitialSms,
  detectConversion,
  generateAgentReply,
} from "@/lib/sms-agent";
import type { SmsMessage, VisitorProfile } from "@/lib/types";
import { smsChatMessageProperties } from "@/lib/chat-unomi-events";
import { loadProfileWithSession, profileAccessErrorResponse } from "@/lib/profile-access";
import { saveProfileSummary } from "@/lib/profile-ai-artifacts";
import { getProfile, trackEvent, trackEvents, updateProfile } from "@/lib/unomi-client";
import { jsonWithVisitorContext } from "@/lib/visitor-context";


type StartBody = { action: "start"; profileId: string; sessionId?: string; force?: boolean };
type ReplyBody = {
  action: "reply";
  profileId: string;
  sessionId?: string;
  message: string;
  useAi?: boolean;
};
type ResetBody = { action: "reset"; profileId: string; sessionId?: string };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as StartBody | ReplyBody | ResetBody;

    if (body.action === "reset") {
      const loaded = await loadProfileWithSession(body.profileId, body.sessionId);
      if (loaded.status !== "ok") return profileAccessErrorResponse(loaded);
      const updated = await updateProfile(loaded.profileId, {
        smsThread: [],
        converted: false,
        conversionType: undefined,
      }, loaded.sessionId);
      return jsonWithVisitorContext({ profile: updated, reset: true }, updated);
    }

    if (body.action === "start") {
      const loaded = await loadProfileWithSession(body.profileId, body.sessionId);
      if (loaded.status !== "ok") return profileAccessErrorResponse(loaded);
      const { profile, sessionId: sid } = loaded;

      if (profile.smsThread.length > 0 && !body.force) {
        return jsonWithVisitorContext({ profile, started: true }, profile);
      }

      const summary = buildTemplateSummary(profile);
      const initial = buildInitialSms(summary);
      const smsThread: SmsMessage[] = [initial];

      const updated = await updateProfile(body.profileId, {
        smsThread,
        converted: false,
        conversionType: undefined,
      }, sid);
      await trackEvent(body.profileId, "smsStarted", {
        messageId: initial.id,
        channel: "sms",
      }, sid);
      await trackEvents(body.profileId, [
        {
          eventType: "smsChatMessage",
          properties: smsChatMessageProperties(initial, { threadAction: "start" }),
        },
      ], sid);

      return jsonWithVisitorContext({ profile: updated, summary }, updated);
    }

    if (body.action === "reply") {
      const text = body.message?.trim();
      if (!text || !body.profileId) {
        return NextResponse.json({ error: "message and profileId required" }, { status: 400 });
      }

      const loaded = await loadProfileWithSession(body.profileId, body.sessionId);
      if (loaded.status !== "ok") return profileAccessErrorResponse(loaded);
      const { profile, sessionId: sid } = loaded;

      const leadMessage: SmsMessage = {
        id: randomUUID(),
        role: "lead",
        body: text,
        timestamp: new Date().toISOString(),
      };

      let summary = buildTemplateSummary(profile);
      if (body.useAi === true) {
        const stored = profile.aiArtifacts?.summary;
        if (stored?.source === "ai") {
          summary = stored.data;
        } else {
          summary = await generateAiSummary(profile);
          await saveProfileSummary(loaded.profileId, summary, "ai", sid);
        }
      }
      const replyResult = await generateAgentReply(profile, summary, text, {
        useAi: body.useAi,
      });
      const agentMessage: SmsMessage = {
        id: randomUUID(),
        role: "agent",
        body: replyResult.body,
        timestamp: new Date().toISOString(),
      };

      const conversionType = detectConversion(text);
      const smsThread = [...profile.smsThread, leadMessage, agentMessage];

      const patch: Partial<VisitorProfile> = { smsThread };
      if (conversionType) {
        patch.converted = true;
        patch.conversionType = conversionType;
        patch.events = [
          createEvent("conversion", { conversionType }),
          ...profile.events,
        ];
      }

      await updateProfile(body.profileId, patch, sid);
      await trackEvents(body.profileId, [
        {
          eventType: "smsChatMessage",
          properties: smsChatMessageProperties(leadMessage),
        },
        {
          eventType: "smsChatMessage",
          properties: smsChatMessageProperties(agentMessage, {
            replySource: replyResult.source,
            safeguarded: replyResult.safeguarded,
            useAi: body.useAi === true,
          }),
        },
      ], sid);
      await trackEvent(body.profileId, "smsReply", {
        leadMessage: text,
        conversionType,
        replySource: replyResult.source,
        safeguarded: replyResult.safeguarded,
        channel: "sms",
      }, sid);

      const finalProfile = await getProfile(body.profileId, sid);
      return jsonWithVisitorContext({
        profile: finalProfile,
        agentMessage,
        replyMeta: replyResult,
      }, finalProfile);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return apiErrorResponse("sms", "SMS action failed", error);
  }
}
