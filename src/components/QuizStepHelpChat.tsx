"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Loader2, MessageCircle, UserRound, X } from "lucide-react";
import { useQuizLocale } from "@/components/QuizLocaleProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { QuizStepId } from "@/lib/quiz-flow";
import type { QuizChatMessage, QuizChatMode, QuizPartialAnswers } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  profileId: string | null;
  step: QuizStepId;
  partialAnswers: QuizPartialAnswers;
};

export default function QuizStepHelpChat({ profileId, step, partialAnswers }: Props) {
  const { copy } = useQuizLocale();
  const help = copy.stepHelp;
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<QuizChatMode>("ai");
  const [messages, setMessages] = useState<QuizChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startedModesRef = useRef<Set<string>>(new Set());

  const modeKey = `${step}:${mode}`;

  const loadFromProfile = useCallback(async () => {
    if (!profileId) return;
    const res = await fetch(`/api/profile?profileId=${encodeURIComponent(profileId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = (await res.json()) as { profile: { quizChat?: { messages: QuizChatMessage[] } } };
    const thread = data.profile.quizChat?.messages ?? [];
    setMessages(thread.filter((m) => m.step === step && m.mode === mode));
  }, [profileId, step, mode]);

  const startChat = useCallback(
    async (nextMode: QuizChatMode) => {
      if (!profileId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "start",
            profileId,
            mode: nextMode,
            step,
            partial: partialAnswers,
          }),
        });
        if (!res.ok) {
          setError(help.sendError);
          return;
        }
        const data = (await res.json()) as { messages: QuizChatMessage[] };
        setMessages(data.messages.filter((m) => m.step === step && m.mode === nextMode));
        startedModesRef.current.add(`${step}:${nextMode}`);
      } catch {
        setError(help.sendError);
      } finally {
        setLoading(false);
      }
    },
    [profileId, step, partialAnswers, help.sendError],
  );

  const openChat = (nextMode: QuizChatMode) => {
    setMode(nextMode);
    setOpen(true);
    if (!profileId) return;
    if (!startedModesRef.current.has(`${step}:${nextMode}`)) {
      void startChat(nextMode);
    } else {
      void loadFromProfile();
    }
  };

  useEffect(() => {
    if (!open || !profileId) return;
    if (!startedModesRef.current.has(modeKey)) {
      void startChat(mode);
    } else {
      void loadFromProfile();
    }
  }, [open, profileId, modeKey, startChat, loadFromProfile]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || !profileId || sending) return;
    setSending(true);
    setError(null);
    setDraft("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          profileId,
          mode,
          step,
          message: text,
          partial: partialAnswers,
        }),
      });
      if (!res.ok) {
        setError(help.sendError);
        setDraft(text);
        return;
      }
      const data = (await res.json()) as { messages: QuizChatMessage[] };
      setMessages(data.messages.filter((m) => m.step === step && m.mode === mode));
    } catch {
      setError(help.sendError);
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  const switchMode = (nextMode: QuizChatMode) => {
    setMode(nextMode);
    setMessages([]);
    if (!profileId) return;
    if (!startedModesRef.current.has(`${step}:${nextMode}`)) {
      void startChat(nextMode);
      return;
    }
    void (async () => {
      const res = await fetch(`/api/profile?profileId=${encodeURIComponent(profileId)}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { profile: { quizChat?: { messages: QuizChatMessage[] } } };
      const thread = data.profile.quizChat?.messages ?? [];
      setMessages(thread.filter((m) => m.step === step && m.mode === nextMode));
    })();
  };

  if (!open) {
    return (
      <div className="mt-5 rounded-xl border border-border/70 bg-muted/20 p-4">
        <p className="mb-3 text-sm font-medium text-foreground">{help.prompt}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 justify-center gap-2 text-base"
            disabled={!profileId}
            onClick={() => openChat("ai")}
          >
            <Bot className="size-4 shrink-0" aria-hidden />
            {help.aiButton}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 justify-center gap-2 text-base"
            disabled={!profileId}
            onClick={() => openChat("human")}
          >
            <UserRound className="size-4 shrink-0" aria-hidden />
            {help.humanButton}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="mt-5 border-primary/25 bg-card/95 shadow-md">
      <CardHeader className="gap-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="size-4 text-primary" aria-hidden />
              {help.prompt}
            </CardTitle>
            <CardDescription>
              {mode === "human" ? help.humanWait : help.aiTab}
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            onClick={() => setOpen(false)}
            aria-label={help.close}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "ai" ? "default" : "outline"}
            className="gap-1.5"
            onClick={() => switchMode("ai")}
          >
            <Bot className="size-3.5" aria-hidden />
            {help.aiTab}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "human" ? "default" : "outline"}
            className="gap-1.5"
            onClick={() => switchMode("human")}
          >
            <UserRound className="size-3.5" aria-hidden />
            {help.humanTab}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <ScrollArea className="h-52 rounded-lg border border-border/60 bg-muted/30">
          <div ref={scrollRef} className="flex min-h-full flex-col gap-2.5 p-3">
            {loading && messages.length === 0 ? (
              <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {help.loading}
              </p>
            ) : null}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                  msg.role === "visitor"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : msg.role === "human"
                      ? "bg-emerald-100 text-emerald-950 dark:bg-emerald-950/50 dark:text-emerald-50"
                      : "bg-background text-foreground shadow-sm ring-1 ring-border/60",
                )}
              >
                {msg.body}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void sendMessage();
            }}
            placeholder={help.placeholder}
            disabled={sending || !profileId}
            className="h-11 flex-1 text-base"
            aria-label={help.placeholder}
          />
          <Button
            type="button"
            className="h-11 px-5"
            disabled={sending || !draft.trim() || !profileId}
            onClick={() => void sendMessage()}
          >
            {sending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : help.send}
          </Button>
        </div>

        {error ? (
          <p className="text-sm font-medium text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
