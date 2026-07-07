"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Bell, BellRing, Loader2 } from "lucide-react";
import AiGenerateButton from "@/components/AiGenerateButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfileSummaryById } from "@/hooks/useProfileSummary";
import type { VisitorProfile } from "@/lib/types";

type Props = { profileId: string; profile: VisitorProfile; sessionId: string };

export default function BrowserPushFollowUp({ profileId, profile, sessionId }: Props) {
  const { summary, loading, generating, aiAvailable, source, generateWithAi } =
    useProfileSummaryById(profileId, "", sessionId);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [demoShown, setDemoShown] = useState(false);

  const firstName = profile.quiz?.firstName ?? "there";
  const score = profile.quiz?.score;

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
  }, []);

  const title =
    score !== null && score !== undefined
      ? `Your score is ready: ${score}/100`
      : "Your retirement summary is ready";

  const body =
    summary?.empatheticResponse ??
    summary?.headline ??
    (score !== null && score !== undefined
      ? `${firstName}, here is your personalized readiness snapshot.`
      : `${firstName}, tap to view your results.`);

  const requestPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      new Notification(title, { body, tag: `retirement-score-${profileId}` });
      setDemoShown(true);
    }
  };

  const showDemoNotification = () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") {
      void requestPermission();
      return;
    }
    new Notification(title, { body, tag: `retirement-score-${profileId}` });
    setDemoShown(true);
  };

  return (
    <div className="mesh-hero min-h-[calc(100vh-8rem)]">
      <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <div className="mb-8 space-y-3 text-center">
          <Badge variant="secondary" className="rounded-full px-3 py-1 text-base">
            <Bell className="mr-1.5 size-4" aria-hidden />
            Browser notification
          </Badge>
          <h1 className="text-3xl font-semibold sm:text-4xl">Thank you, {firstName}!</h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            You chose a gentle alert on this device — no email or text required.
          </p>
          <AiGenerateButton
            aiAvailable={aiAvailable}
            source={source}
            generating={generating}
            onGenerate={() => void generateWithAi()}
            label="Personalize notification with AI"
            className="justify-center"
          />
        </div>

        <Card
          className="mx-auto max-w-sm overflow-hidden border-border/70 shadow-xl"
          role="region"
          aria-label="Notification preview"
        >
          <CardHeader className="pb-2">
            <CardDescription className="text-sm uppercase tracking-wide">Preview</CardDescription>
            <CardTitle className="flex items-start gap-3 text-left text-lg font-semibold">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <BellRing className="size-5" aria-hidden />
              </span>
              <span className="space-y-1">
                <span className="block">{title}</span>
                <span className="block text-base font-normal text-muted-foreground">{body}</span>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pb-6 text-base">
            {loading && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Loading template preview…
              </p>
            )}
            {summary && !loading && summary.visitorNextSteps.length > 0 && (
              <div className="space-y-2 text-sm">
                <p className="font-medium text-foreground">Your next steps</p>
                <ol className="space-y-1.5 leading-relaxed text-muted-foreground">
                  {summary.visitorNextSteps.map((step, i) => (
                    <li key={i}>
                      {i + 1}. {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {permission === "unsupported" && (
              <p className="text-sm text-muted-foreground">
                This browser does not support notifications. The preview above shows what you would see on a
                supported device.
              </p>
            )}
            {permission !== "unsupported" && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Permission: <span className="font-medium text-foreground">{permission}</span>
                </p>
                {permission !== "granted" ? (
                  <Button type="button" size="lg" className="h-12 text-base" onClick={() => void requestPermission()}>
                    Allow notifications on this device
                  </Button>
                ) : (
                  <Button type="button" variant="secondary" size="lg" className="h-12 text-base" onClick={showDemoNotification}>
                    Show notification again
                  </Button>
                )}
                {demoShown && (
                  <p className="text-sm text-emerald-700 dark:text-emerald-300" role="status">
                    Notification sent. Check your system tray or lock screen.
                  </p>
                )}
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
