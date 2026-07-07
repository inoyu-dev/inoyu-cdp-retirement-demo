"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CONTACT_CHANNEL_LABELS } from "@/lib/contact-channels";
import { withSessionQuery } from "@/lib/session-id";
import type { ContactChannel, VisitorProfile } from "@/lib/types";

type MessagingVariant = "sms" | "whatsapp" | "line";

type Props = {
  profileId: string;
  sessionId: string;
  variant: MessagingVariant;
};

const VARIANT_CONFIG: Record<
  MessagingVariant,
  {
    channel: ContactChannel;
    badgeLabel: string;
    subtitle: string;
    agentName: string;
    agentSubtitle: string;
    agentInitials: string;
    shellClass: string;
    headerClass: string;
    bodyClass: string;
    footerClass: string;
    agentBubbleClass: string;
    leadBubbleClass: string;
    inputClass: string;
    ariaLabel: string;
  }
> = {
  sms: {
    channel: "sms",
    badgeLabel: "Text follow-up",
    subtitle: "Your score is on the way. Below is the conversation you would receive on your phone.",
    agentName: "Retirement Team",
    agentSubtitle: "Your Retirement Guide",
    agentInitials: "RT",
    shellClass: "phone-shell",
    headerClass: "flex items-center gap-3 border-b border-white/10 bg-zinc-900/90 px-4 pb-3 pt-10",
    bodyClass: "bg-zinc-950",
    footerClass: "flex gap-2 border-t border-white/10 bg-zinc-900 p-3",
    agentBubbleClass: "bubble-agent",
    leadBubbleClass: "bubble-lead",
    inputClass:
      "h-11 flex-1 rounded-full border-zinc-700 bg-zinc-800 text-base text-white placeholder:text-zinc-500",
    ariaLabel: "Text message conversation",
  },
  whatsapp: {
    channel: "whatsapp",
    badgeLabel: "WhatsApp follow-up",
    subtitle: "Below is the WhatsApp chat you would receive — popular across Asia and much of the world.",
    agentName: "Retirement Guide",
    agentSubtitle: "WhatsApp Business",
    agentInitials: "RG",
    shellClass: "overflow-hidden rounded-2xl border border-emerald-900/30 shadow-xl",
    headerClass: "flex items-center gap-3 bg-[#075E54] px-4 py-3 text-white",
    bodyClass: "bg-[#ECE5DD]",
    footerClass: "flex gap-2 border-t border-emerald-900/20 bg-[#F0F0F0] p-3",
    agentBubbleClass:
      "max-w-[85%] self-start rounded-lg rounded-tl-none bg-white px-3 py-2 text-sm leading-relaxed text-zinc-900 shadow-sm",
    leadBubbleClass:
      "max-w-[85%] self-end rounded-lg rounded-tr-none bg-[#DCF8C6] px-3 py-2 text-sm leading-relaxed text-zinc-900 shadow-sm",
    inputClass:
      "h-11 flex-1 rounded-full border-emerald-900/20 bg-white text-base text-zinc-900 placeholder:text-zinc-500",
    ariaLabel: "WhatsApp conversation",
  },
  line: {
    channel: "line",
    badgeLabel: "LINE follow-up",
    subtitle: "Below is the LINE chat you would receive — widely used in Japan, Taiwan, and Thailand.",
    agentName: "Retirement Guide",
    agentSubtitle: "LINE Official Account",
    agentInitials: "RG",
    shellClass: "overflow-hidden rounded-2xl border border-zinc-200 shadow-xl dark:border-zinc-800",
    headerClass: "flex items-center gap-3 bg-[#06C755] px-4 py-3 text-white",
    bodyClass: "bg-[#8CABD9]",
    footerClass: "flex gap-2 border-t border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950",
    agentBubbleClass:
      "max-w-[85%] self-start rounded-2xl bg-white px-3 py-2 text-sm leading-relaxed text-zinc-900 shadow-sm",
    leadBubbleClass:
      "max-w-[85%] self-end rounded-2xl bg-[#06C755] px-3 py-2 text-sm leading-relaxed text-white shadow-sm",
    inputClass:
      "h-11 flex-1 rounded-full border-zinc-200 bg-zinc-50 text-base text-zinc-900 placeholder:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white",
    ariaLabel: "LINE conversation",
  },
};

export default function MessagingFollowUp({ profileId, sessionId, variant }: Props) {
  const config = VARIANT_CONFIG[variant];
  const [profile, setProfile] = useState<VisitorProfile | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadProfile = useCallback(async () => {
    const res = await fetch(withSessionQuery(`/api/profile?profileId=${encodeURIComponent(profileId)}`, sessionId), {
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
        body: JSON.stringify({ action: "start", profileId, sessionId }),
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
  }, [profileId, sessionId, loadProfile]);

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
      body: JSON.stringify({ action: "reply", profileId, sessionId, message: text }),
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
            {CONTACT_CHANNEL_LABELS[config.channel]} · {config.badgeLabel}
          </Badge>
          <h1 className="text-3xl font-semibold sm:text-4xl">Thank you, {firstName}!</h1>
          <p className="text-lg leading-relaxed text-muted-foreground">{config.subtitle}</p>
        </div>

        <div
          className={`mx-auto flex h-[min(680px,72vh)] max-w-[390px] flex-col ${config.shellClass}`}
          role="region"
          aria-label={config.ariaLabel}
        >
          <div className={config.headerClass}>
            <Avatar className="size-10 border border-white/20">
              <AvatarFallback className="bg-white/20 text-sm font-semibold text-white">
                {config.agentInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{config.agentName}</p>
              <p className="text-xs opacity-80">{config.agentSubtitle}</p>
            </div>
          </div>

          <ScrollArea className={`flex-1 ${config.bodyClass}`}>
            <div ref={scrollRef} className="flex min-h-full flex-col gap-3 p-4">
              {!profile && (
                <p className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-600">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Loading messages…
                </p>
              )}
              {profile?.smsThread.map((msg) => (
                <div
                  key={msg.id}
                  className={msg.role === "agent" ? config.agentBubbleClass : config.leadBubbleClass}
                >
                  {msg.body}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className={config.footerClass}>
            <Input
              id={`${variant}-reply`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void sendReply();
              }}
              placeholder="Type your reply…"
              disabled={sending}
              className={config.inputClass}
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
