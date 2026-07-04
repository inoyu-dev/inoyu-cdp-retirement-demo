import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import {
  buildHumanAcknowledgment,
  buildQuizChatWelcome,
  generateQuizAiReply,
} from "@/lib/quiz-chat-agent";
import { QUIZ_STEPS } from "@/lib/quiz-flow";
import type { QuizChatMessage, QuizChatMode, QuizPartialAnswers } from "@/lib/types";
import { getProfile, trackEvent, updateProfile } from "@/lib/unomi-client";

type StartBody = {
  action: "start";
  profileId: string;
  mode: QuizChatMode;
  step: number;
  partial?: QuizPartialAnswers;
};

type ReplyBody = {
  action: "reply";
  profileId: string;
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

      const profile = await getProfile(body.profileId);
      if (!profile) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }

      const existing = profile.quizChat?.messages ?? [];
      const hasWelcome = existing.some(
        (m) => m.mode === body.mode && m.step === body.step && m.role !== "visitor",
      );

      let messages = existing;
      if (!hasWelcome) {
        const welcome = buildQuizChatWelcome(body.mode, body.step, body.partial);
        messages = [...existing, welcome];
      }

      const quizChat = {
        messages,
        humanRequested: profile.quizChat?.humanRequested || body.mode === "human",
        lastMode: body.mode,
      };

      await updateProfile(body.profileId, { quizChat });
      await trackEvent(body.profileId, "quizChatOpened", {
        step: body.step,
        mode: body.mode,
      });

      if (body.mode === "human") {
        await trackEvent(body.profileId, "humanChatRequested", { step: body.step });
      }

      const updated = await getProfile(body.profileId);
      return NextResponse.json({ profile: updated, messages: updated?.quizChat?.messages ?? messages });
    }

    if (body.action === "reply") {
      const text = body.message?.trim();
      if (!text || !body.profileId || !isMode(body.mode) || !isQuizStep(body.step)) {
        return NextResponse.json({ error: "Invalid chat reply" }, { status: 400 });
      }

      const profile = await getProfile(body.profileId);
      if (!profile) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }

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

      await updateProfile(body.profileId, {
        quizChat: {
          messages: nextMessages,
          humanRequested: true,
          lastMode: body.mode,
        },
      });

      await trackEvent(body.profileId, "quizChatMessage", {
        step: body.step,
        mode: body.mode,
        role: "visitor",
      });

      const updated = await getProfile(body.profileId);
      return NextResponse.json({ profile: updated, messages: updated?.quizChat?.messages ?? nextMessages });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Chat action failed" }, { status: 500 });
  }
}
