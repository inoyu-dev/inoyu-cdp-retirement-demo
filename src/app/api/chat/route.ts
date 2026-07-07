import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import {
  buildHumanAcknowledgment,
  buildQuizChatWelcome,
  generateQuizAiReply,
} from "@/lib/quiz-chat-agent";
import { quizChatMessageProperties } from "@/lib/chat-unomi-events";
import { QUIZ_STEPS } from "@/lib/quiz-flow";
import { loadProfileWithSession, profileAccessErrorResponse } from "@/lib/profile-access";
import type { QuizChatMessage, QuizChatMode, QuizPartialAnswers } from "@/lib/types";
import { getProfile, trackEvent, trackEvents, updateProfile } from "@/lib/unomi-client";
import { jsonWithVisitorContext } from "@/lib/visitor-context";


type StartBody = {
  action: "start";
  profileId: string;
  sessionId?: string;
  mode: QuizChatMode;
  step: number;
  partial?: QuizPartialAnswers;
};

type ReplyBody = {
  action: "reply";
  profileId: string;
  sessionId?: string;
  mode: QuizChatMode;
  step: number;
  message: string;
  partial?: QuizPartialAnswers;
};

function isQuizStep(value: number): value is (typeof QUIZ_STEPS)[number]["id"] {
  return value >= 1 && value <= 4;
}

function isMode(value: string): value is QuizChatMode {
  return value === "ai" || value === "human";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as StartBody | ReplyBody;

    if (body.action === "start") {
      if (!body.profileId || !isMode(body.mode) || !isQuizStep(body.step)) {
        return NextResponse.json({ error: "Invalid chat start" }, { status: 400 });
      }

      const loaded = await loadProfileWithSession(body.profileId, body.sessionId);
      if (loaded.status !== "ok") return profileAccessErrorResponse(loaded);
      const { profile, sessionId: sid } = loaded;

      const existing = profile.quizChat?.messages ?? [];
      const hasWelcome = existing.some(
        (m) => m.mode === body.mode && m.step === body.step && m.role !== "visitor",
      );

      let messages = existing;
      const chatEvents: Array<{ eventType: string; properties: Record<string, unknown> }> = [];

      if (!hasWelcome) {
        const welcome = buildQuizChatWelcome(body.mode, body.step, body.partial);
        messages = [...existing, welcome];
        chatEvents.push({
          eventType: "quizChatMessage",
          properties: quizChatMessageProperties(welcome),
        });
      }

      const quizChat = {
        messages,
        humanRequested: profile.quizChat?.humanRequested || body.mode === "human",
        lastMode: body.mode,
      };

      await updateProfile(body.profileId, { quizChat }, sid);

      await trackEvent(
        body.profileId,
        "quizChatOpened",
        { step: body.step, mode: body.mode, channel: "quiz" },
        sid,
      );

      if (body.mode === "human") {
        await trackEvent(
          body.profileId,
          "humanChatRequested",
          { step: body.step, channel: "quiz" },
          sid,
        );
      }

      if (chatEvents.length > 0) {
        await trackEvents(body.profileId, chatEvents, sid);
      }

      const updated = await getProfile(body.profileId, sid);
      return jsonWithVisitorContext({ profile: updated, messages: updated?.quizChat?.messages ?? messages }, updated);
    }

    if (body.action === "reply") {
      const text = body.message?.trim();
      if (!text || !body.profileId || !isMode(body.mode) || !isQuizStep(body.step)) {
        return NextResponse.json({ error: "Invalid chat reply" }, { status: 400 });
      }

      const loaded = await loadProfileWithSession(body.profileId, body.sessionId);
      if (loaded.status !== "ok") return profileAccessErrorResponse(loaded);
      const { profile, sessionId: sid } = loaded;

      const visitorMessage: QuizChatMessage = {
        id: randomUUID(),
        role: "visitor",
        body: text,
        timestamp: new Date().toISOString(),
        step: body.step,
        mode: body.mode,
      };

      const prior = profile.quizChat?.messages ?? [];
      const nextMessages: QuizChatMessage[] = [...prior, visitorMessage];

      if (body.mode === "ai") {
        const replyBody = await generateQuizAiReply(
          profile,
          body.step,
          text,
          body.partial,
          nextMessages,
        );
        nextMessages.push({
          id: randomUUID(),
          role: "ai",
          body: replyBody,
          timestamp: new Date().toISOString(),
          step: body.step,
          mode: "ai",
        });
      } else {
        nextMessages.push(buildHumanAcknowledgment(body.step, body.partial));
      }

      await updateProfile(
        body.profileId,
        {
          quizChat: {
            messages: nextMessages,
            humanRequested: true,
            lastMode: body.mode,
          },
        },
        sid,
      );

      const newMessages = nextMessages.slice(prior.length);
      await trackEvents(
        body.profileId,
        newMessages.map((message) => ({
          eventType: "quizChatMessage",
          properties: quizChatMessageProperties(message),
        })),
        sid,
      );

      const updated = await getProfile(body.profileId, sid);
      return jsonWithVisitorContext({ profile: updated, messages: updated?.quizChat?.messages ?? nextMessages }, updated);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return apiErrorResponse("chat", "Chat action failed", error);
  }
}
