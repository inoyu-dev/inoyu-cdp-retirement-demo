"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { VisitorProfile } from "@/lib/types";

type Props = { profileId: string };

export default function SmsSimulator({ profileId }: Props) {
  const [profile, setProfile] = useState<VisitorProfile | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadProfile = useCallback(async () => {
    const res = await fetch(`/api/profile?profileId=${encodeURIComponent(profileId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { profile: VisitorProfile };
    return data.profile;
  }, [profileId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const startRes = await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", profileId }),
      });
      if (startRes.ok) {
        const data = (await startRes.json()) as { profile: VisitorProfile };
        if (!cancelled) setProfile(data.profile);
        return;
      }
      const p = await loadProfile();
      if (!cancelled) setProfile(p);
    })();
    return () => {
      cancelled = true;
    };
  }, [profileId, loadProfile]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [profile?.smsThread.length]);

  const sendReply = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    setDraft("");

    const res = await fetch("/api/sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reply", profileId, message: text }),
    });

    setSending(false);
    if (!res.ok) {
      setError("Your message did not send. Please try again.");
      setDraft(text);
      return;
    }
    const data = (await res.json()) as { profile: VisitorProfile };
    setProfile(data.profile);
  };

  const firstName = profile?.quiz?.firstName ?? "there";

  return (
    <div className="mesh-hero min-h-[calc(100vh-8rem)]">
      <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <div className="mb-8 space-y-3 text-center">
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            <MessageCircle className="mr-1.5 size-3.5" aria-hidden />
            Text follow-up
          </Badge>
          <h1 className="text-3xl font-semibold sm:text-4xl">Thank you, {firstName}!</h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Your score is on the way. Below is the conversation you would receive on your phone.
          </p>
        </div>

        <div
          className="phone-shell mx-auto flex h-[min(680px,72vh)] max-w-[390px] flex-col"
          role="region"
          aria-label="Text message conversation"
        >
          <div className="flex items-center gap-3 border-b border-white/10 bg-zinc-900/90 px-4 pb-3 pt-10">
            <Avatar className="size-10 border border-white/10">
              <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
                RT
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-white">Retirement Team</p>
              <p className="text-xs text-zinc-400">Your Retirement Guide</p>
            </div>
          </div>

          <ScrollArea className="flex-1 bg-zinc-950">
            <div ref={scrollRef} className="flex min-h-full flex-col gap-3 p-4">
              {!profile && (
                <p className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-400">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Loading messages…
                </p>
              )}
              {profile?.smsThread.map((msg) => (
                <div
                  key={msg.id}
                  className={msg.role === "agent" ? "bubble-agent" : "bubble-lead"}
                >
                  {msg.body}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex gap-2 border-t border-white/10 bg-zinc-900 p-3">
            <Input
              id="sms-reply"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void sendReply();
              }}
              placeholder="Type your reply…"
              disabled={sending}
              className="h-11 flex-1 rounded-full border-zinc-700 bg-zinc-800 text-base text-white placeholder:text-zinc-500"
              aria-label="Type your reply"
            />
            <Button
              type="button"
              onClick={() => void sendReply()}
              disabled={sending || !draft.trim()}
              className="h-11 rounded-full px-5"
            >
              Send
            </Button>
          </div>
        </div>

        {profile?.converted && (
          <Card className="mx-auto mt-6 max-w-[390px] border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
            <CardContent className="flex items-start gap-3 pt-6">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
              <p className="text-sm leading-relaxed text-emerald-900 dark:text-emerald-100">
                We noted your request. Someone will follow up if you asked for a call or guide.
              </p>
            </CardContent>
          </Card>
        )}

        {error && (
          <p className="mt-4 text-center text-sm font-medium text-destructive" role="alert">
            {error}
          </p>
        )}

        <p className="mx-auto mt-6 max-w-sm text-center text-sm text-muted-foreground">
          Reply naturally — tell us what worries you, or ask us to send your summary.
        </p>

        <p className="mt-8 text-center">
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/" />}>
            <ArrowLeft className="size-4" aria-hidden />
            Back to home
          </Button>
        </p>
      </div>
    </div>
  );
}
