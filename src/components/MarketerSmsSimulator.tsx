"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useIntegrationsHealth } from "@/hooks/useIntegrationsHealth";
import {
  Bot,
  Loader2,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SMS_SCENARIO_PRESETS, type SmsReplyResult } from "@/lib/sms-agent";
import type { VisitorProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  profileId: string;
  sessionId: string;
  profileName?: string;
};

type ReplyMeta = SmsReplyResult;

export default function MarketerSmsSimulator({ profileId, sessionId, profileName }: Props) {
  const { health } = useIntegrationsHealth();
  const aiAvailable = health?.openai.ok ?? false;
  const [profile, setProfile] = useState<VisitorProfile | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const [useAi, setUseAi] = useState(false);
  const [lastMeta, setLastMeta] = useState<ReplyMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const startThread = useCallback(async (force = false) => {
    setStarting(true);
    setError(null);
    const res = await fetch("/api/sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", profileId, sessionId, force }),
    });
    setStarting(false);
    if (!res.ok) {
      setError("Could not start SMS thread.");
      return;
    }
    const data = (await res.json()) as { profile: VisitorProfile };
    setProfile(data.profile);
    setLastMeta(null);
  }, [profileId, sessionId]);

  useEffect(() => {
    void startThread(false);
  }, [profileId, startThread]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [profile?.smsThread.length]);

  const sendReply = async (textOverride?: string) => {
    const text = (textOverride ?? draft).trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    if (!textOverride) setDraft("");

    const res = await fetch("/api/sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reply", profileId, sessionId, message: text, useAi }),
    });

    setSending(false);
    if (!res.ok) {
      setError("Reply failed — try again.");
      if (!textOverride) setDraft(text);
      return;
    }
    const data = (await res.json()) as { profile: VisitorProfile; replyMeta?: ReplyMeta };
    setProfile(data.profile);
    if (data.replyMeta) setLastMeta(data.replyMeta);
  };

  const resetThread = async () => {
    setError(null);
    await fetch("/api/sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset", profileId, sessionId }),
    });
    await startThread(true);
  };

  const firstName = profile?.quiz?.firstName ?? profileName ?? "Visitor";

  return (
    <Card className="overflow-hidden border-border/60 bg-card/50">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="size-4 text-primary" aria-hidden />
              SMS scenario simulator
            </CardTitle>
            <CardDescription>
              Play the lead for {firstName} — test AI replies with compliance safeguards.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {aiAvailable ? (
            <>
            <Button
              type="button"
              size="sm"
              variant={useAi ? "default" : "outline"}
              className="gap-1.5"
              onClick={() => setUseAi(true)}
            >
              <Sparkles className="size-3.5" aria-hidden />
              AI on
            </Button>
            <Button
              type="button"
              size="sm"
              variant={!useAi ? "default" : "outline"}
              className="gap-1.5"
              onClick={() => setUseAi(false)}
            >
              <Bot className="size-3.5" aria-hidden />
              Templates only
            </Button>
            </>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">Template replies (AI not configured)</Badge>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={starting}
              onClick={() => void resetThread()}
            >
              <RefreshCw className={cn("size-3.5", starting && "animate-spin")} aria-hidden />
              Reset
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Badge variant="outline" className="gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="size-3" aria-hidden />
            Safeguards active
          </Badge>
          {lastMeta ? (
            <Badge variant="secondary" className="text-xs">
              Last reply: {lastMeta.source === "ai" ? "AI" : "Template"}
              {lastMeta.safeguarded ? " · fallback" : ""}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {SMS_SCENARIO_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              disabled={sending || starting}
              onClick={() => void sendReply(preset.message)}
            >
              {preset.label}
            </Button>
          ))}
        </div>

        <div
          className="phone-shell mx-auto flex h-[min(420px,50vh)] max-w-[360px] flex-col"
          role="region"
          aria-label="SMS simulator for marketers"
        >
          <div className="flex items-center gap-3 border-b border-white/10 bg-zinc-900/90 px-4 pb-3 pt-8">
            <Avatar className="size-9 border border-white/10">
              <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                RT
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-white">Retirement Team → {firstName}</p>
              <p className="text-xs text-zinc-400">Simulator · you are the lead</p>
            </div>
          </div>

          <ScrollArea className="flex-1 bg-zinc-950">
            <div ref={scrollRef} className="flex min-h-full flex-col gap-3 p-3">
              {(starting || !profile) && (
                <p className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-400">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Starting thread…
                </p>
              )}
              {profile?.smsThread.map((msg) => (
                <div
                  key={msg.id}
                  className={msg.role === "agent" ? "bubble-agent text-sm" : "bubble-lead text-sm"}
                >
                  {msg.body}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex gap-2 border-t border-white/10 bg-zinc-900 p-2.5">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void sendReply();
              }}
              placeholder="Type as the lead…"
              disabled={sending || starting}
              className="h-10 flex-1 rounded-full border-zinc-700 bg-zinc-800 text-sm text-white placeholder:text-zinc-500"
              aria-label="Simulated lead message"
            />
            <Button
              type="button"
              size="sm"
              className="h-10 rounded-full px-4"
              disabled={sending || starting || !draft.trim()}
              onClick={() => void sendReply()}
            >
              Send
            </Button>
          </div>
        </div>

        {profile?.converted ? (
          <p className="text-center text-sm text-emerald-600 dark:text-emerald-400">
            Conversion detected: {profile.conversionType?.replace(/_/g, " ")}
          </p>
        ) : null}

        {error ? (
          <p className="text-center text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <p className="text-xs leading-relaxed text-muted-foreground">
          AI replies pass through filters (no guarantees, urgency, investment picks, URLs). Unsafe
          outputs fall back to approved templates automatically.
        </p>
      </CardContent>
    </Card>
  );
}
