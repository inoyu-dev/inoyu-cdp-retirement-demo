"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AiGenerateButton from "@/components/AiGenerateButton";
import ScoreReveal from "@/components/ScoreReveal";
import { getQuizCopy } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { useProfileSummaryById } from "@/hooks/useProfileSummary";
import type { VisitorProfile } from "@/lib/types";

type Props = { profile: VisitorProfile; sessionId: string };

export default function OnPageFollowUp({ profile, sessionId }: Props) {
  const quiz = profile.quiz ?? {};
  const copy = getQuizCopy(profile.preferredLanguage ?? "en");
  const { summary, loading, generating, aiAvailable, source, generateWithAi } =
    useProfileSummaryById(profile.profileId, "", sessionId);

  return (
    <div className="mesh-hero min-h-[calc(100vh-8rem)]">
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <div className="mb-4 flex justify-center">
          <AiGenerateButton
            aiAvailable={aiAvailable}
            source={source}
            generating={generating}
            onGenerate={() => void generateWithAi()}
            label="Personalize results with AI"
          />
        </div>
        <ScoreReveal
          copy={copy}
          quiz={quiz}
          firstName={quiz.firstName}
          visitorNextSteps={summary?.visitorNextSteps ?? []}
          loadingNextSteps={loading}
          empatheticResponse={summary?.empatheticResponse}
          loadingEmpathetic={loading && !summary?.empatheticResponse}
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
