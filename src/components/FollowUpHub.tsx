"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import BrowserPushFollowUp from "@/components/BrowserPushFollowUp";
import EmailFollowUp from "@/components/EmailFollowUp";
import MessagingFollowUp from "@/components/MessagingFollowUp";
import OnPageFollowUp from "@/components/OnPageFollowUp";
import PhoneCallFollowUp from "@/components/PhoneCallFollowUp";
import type { ContactChannel, VisitorProfile } from "@/lib/types";

type Props = { profileId: string };

const KNOWN_CHANNELS: ContactChannel[] = [
  "email",
  "browser_push",
  "sms",
  "whatsapp",
  "line",
  "phone_call",
  "on_page",
];

function isKnownChannel(value: string | undefined): value is ContactChannel {
  return KNOWN_CHANNELS.includes(value as ContactChannel);
}

function resolveChannel(profile: VisitorProfile): ContactChannel {
  const channel = profile.quiz?.contactChannel;
  if (isKnownChannel(channel)) return channel;
  if (profile.quiz?.smsConsent) return "sms";
  return "email";
}

export default function FollowUpHub({ profileId }: Props) {
  const [profile, setProfile] = useState<VisitorProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    const res = await fetch(`/api/profile?profileId=${encodeURIComponent(profileId)}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      setError("We could not load your results. Try the quiz again.");
      return null;
    }
    const data = (await res.json()) as { profile: VisitorProfile };
    setProfile(data.profile);
    return data.profile;
  }, [profileId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  if (error) {
    return (
      <div className="empty-state">
        <p role="alert">{error}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        <span className="text-lg">Loading your follow-up…</span>
      </div>
    );
  }

  const channel = resolveChannel(profile);

  switch (channel) {
    case "email":
      return <EmailFollowUp profileId={profileId} profile={profile} />;
    case "browser_push":
      return <BrowserPushFollowUp profileId={profileId} profile={profile} />;
    case "on_page":
      return <OnPageFollowUp profile={profile} />;
    case "sms":
      return <MessagingFollowUp profileId={profileId} variant="sms" />;
    case "whatsapp":
      return <MessagingFollowUp profileId={profileId} variant="whatsapp" />;
    case "line":
      return <MessagingFollowUp profileId={profileId} variant="line" />;
    case "phone_call":
      return <PhoneCallFollowUp profileId={profileId} profile={profile} />;
    default: {
      const _exhaustive: never = channel;
      return _exhaustive;
    }
  }
}
