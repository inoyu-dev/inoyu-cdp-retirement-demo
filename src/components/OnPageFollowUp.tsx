"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import ScoreReveal from "@/components/ScoreReveal";
import { getQuizCopy } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import type { AiSummary, VisitorProfile } from "@/lib/types";

type Props = { profile: VisitorProfile };

export default function OnPageFollowUp({ profile }: Props) {
  const quiz = profile.quiz ?? {};
  const copy = getQuizCopy(profile.preferredLanguage ?? "en");
  const [visitorNextSteps, setVisitorNextSteps] = useState<string[]>([]);
  const [loadingNextSteps, setLoadingNextSteps] = useState(true);
  const [empatheticResponse, setEmpatheticResponse] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/summary?profileId=${encodeURIComponent(profile.profileId)}`, {
        cache: "no-store",
      });
      if (!res.ok || cancelled) {
        if (!cancelled) setLoadingNextSteps(false);
        return;
      }
      const data = (await res.json()) as { summary: AiSummary };
      if (!cancelled) {
        setVisitorNextSteps(data.summary.visitorNextSteps ?? []);
        setEmpatheticResponse(data.summary.empatheticResponse);
        setLoadingNextSteps(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile.profileId]);

  return (
    <div className="mesh-hero min-h-[calc(100vh-8rem)]">
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <ScoreReveal
          copy={copy}
          quiz={quiz}
          firstName={quiz.firstName}
          visitorNextSteps={visitorNextSteps}
          loadingNextSteps={loadingNextSteps}
          empatheticResponse={empatheticResponse}
          loadingEmpathetic={loadingNextSteps && !empatheticResponse}
        />
        <p className="mt-6 text-center text-base leading-relaxed text-muted-foreground">
          You asked to see everything on this page only. We will not email, text, or notify you
          unless you choose that later.
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
