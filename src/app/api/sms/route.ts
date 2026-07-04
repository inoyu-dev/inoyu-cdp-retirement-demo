import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { generateAiSummary } from "@/lib/ai-summary";
import { createEvent } from "@/lib/local-store";
import {
  buildInitialSms,
  detectConversion,
  generateAgentReply,
} from "@/lib/sms-agent";
import type { SmsMessage, VisitorProfile } from "@/lib/types";
import { getProfile, trackEvent, updateProfile } from "@/lib/unomi-client";

type StartBody = { action: "start"; profileId: string; force?: boolean };
type ReplyBody = {
  action: "reply";
  profileId: string;
  message: string;
  useAi?: boolean;
};
type ResetBody = { action: "reset"; profileId: string };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as StartBody | ReplyBody | ResetBody;

    if (body.action === "reset") {
      const profile = await getProfile(body.profileId);
      if (!profile) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }
      const updated = await updateProfile(body.profileId, {
        smsThread: [],
        converted: false,
        conversionType: undefined,
      });
      return NextResponse.json({ profile: updated, reset: true });
    }

    if (body.action === "start") {
      const profile = await getProfile(body.profileId);
      if (!profile) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }

      if (profile.smsThread.length > 0 && !body.force) {
        return NextResponse.json({ profile, started: true });
      }

      const summary = await generateAiSummary(profile);
      const initial = buildInitialSms(summary);
      const smsThread: SmsMessage[] = [initial];

      const updated = await updateProfile(body.profileId, {
        smsThread,
        converted: false,
        conversionType: undefined,
      });
      await trackEvent(body.profileId, "smsStarted", { messageId: initial.id });

      return NextResponse.json({ profile: updated, summary });
    }

    if (body.action === "reply") {
      const text = body.message?.trim();
      if (!text || !body.profileId) {
        return NextResponse.json({ error: "message and profileId required" }, { status: 400 });
      }

      const profile = await getProfile(body.profileId);
      if (!profile) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }

      const leadMessage: SmsMessage = {
        id: randomUUID(),
        role: "lead",
        body: text,
        timestamp: new Date().toISOString(),
      };

      const summary = await generateAiSummary(profile);
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

      await updateProfile(body.profileId, patch);
      await trackEvent(body.profileId, "smsReply", {
        leadMessage: text,
        conversionType,
        replySource: replyResult.source,
        safeguarded: replyResult.safeguarded,
      });

      const finalProfile = await getProfile(body.profileId);
      return NextResponse.json({
        profile: finalProfile,
        agentMessage,
        replyMeta: replyResult,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "SMS action failed" }, { status: 500 });
  }
}
