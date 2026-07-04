"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarClock, CheckCircle2, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CONTACT_CHANNEL_LABELS } from "@/lib/contact-channels";
import type { AiSummary, VisitorProfile } from "@/lib/types";

type Props = { profileId: string; profile: VisitorProfile };

const TIME_SLOTS = [
  "Today, 2:00–4:00 PM",
  "Tomorrow, 10:00 AM–12:00 PM",
  "Tomorrow, 4:00–6:00 PM",
];

export default function PhoneCallFollowUp({ profileId, profile }: Props) {
  const [summary, setSummary] = useState<AiSummary | null>(null);
  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[1]);

  const firstName = profile.quiz?.firstName ?? "there";
  const phone = profile.quiz?.phone ?? "your number on file";
  const score = profile.quiz?.score;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/summary?profileId=${encodeURIComponent(profileId)}`, {
        cache: "no-store",
      });
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as { summary: AiSummary };
      if (!cancelled) setSummary(data.summary);
    })();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  return (
    <div className="mesh-hero min-h-[calc(100vh-8rem)]">
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <div className="mb-8 space-y-3 text-center">
          <Badge variant="secondary" className="rounded-full px-3 py-1 text-base">
            <Phone className="mr-1.5 size-4" aria-hidden />
            {CONTACT_CHANNEL_LABELS.phone_call}
          </Badge>
          <h1 className="text-3xl font-semibold sm:text-4xl">Thank you, {firstName}!</h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            You chose a phone call — the most trusted channel for many US retirement leads. We will
            call <span className="font-medium text-foreground">{phone}</span>.
          </p>
        </div>

        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <CalendarClock className="size-5 text-primary" aria-hidden />
              Pick a callback window
            </CardTitle>
            <CardDescription className="text-base">
              Choose a window that works for you. We will call the number you provided.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {TIME_SLOTS.map((slot) => (
              <label
                key={slot}
                className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
              >
                <input
                  type="radio"
                  name="callback-slot"
                  value={slot}
                  checked={selectedSlot === slot}
                  onChange={() => setSelectedSlot(slot)}
                  className="size-4 accent-primary"
                />
                <span className="text-base">{slot}</span>
              </label>
            ))}

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
                <div className="space-y-1 text-sm leading-relaxed text-emerald-900 dark:text-emerald-100">
                  <p className="font-medium">Callback scheduled</p>
                  <p>
                    {selectedSlot} · {phone}
                    {score !== null && score !== undefined ? ` · Score ${score}/100` : ""}
                  </p>
                </div>
              </div>
            </div>

            {summary && summary.visitorNextSteps.length > 0 && (
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-sm font-medium text-foreground">While you wait for our call</p>
                <ol className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">
                  {summary.visitorNextSteps.map((step, i) => (
                    <li key={i}>{i + 1}. {step}</li>
                  ))}
                </ol>
              </div>
            )}
          </CardContent>
        </Card>

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
