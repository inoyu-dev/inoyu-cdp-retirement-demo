"use client";

import { useCallback, useEffect, useState } from "react";
import { useIntegrationsHealth } from "@/hooks/useIntegrationsHealth";
import {
  ArrowRight,
  Check,
  FlaskConical,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import AiGenerateButton from "@/components/AiGenerateButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatStepOrder } from "@/lib/quiz-variants";
import type {
  QuizExperiment,
  QuizExperimentStats,
  QuizVariantConfig,
  QuizVariantProposal,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type VariantPayload = {
  pendingProposal: QuizVariantProposal | null;
  experiment: QuizExperiment | null;
  variants: QuizVariantConfig[];
  stats: QuizExperimentStats | null;
  proposalHistory: QuizVariantProposal[];
};

export default function QuizVariantPanel() {
  const { health } = useIntegrationsHealth();
  const aiAvailable = health?.openai.ok ?? false;
  const [payload, setPayload] = useState<VariantPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [proposing, setProposing] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/quiz-variants", { cache: "no-store" });
    if (!res.ok) return;
    setPayload((await res.json()) as VariantPayload);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 15000);
    return () => clearInterval(id);
  }, [refresh]);

  const propose = async (useAi = false) => {
    setProposing(true);
    setMessage(null);
    const res = await fetch("/api/quiz-variants/propose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ useAi }),
    });
    setProposing(false);
    if (!res.ok) {
      const err = (await res.json()) as { error?: string };
      setMessage(err.error ?? "Could not generate proposal");
      return;
    }
    const data = (await res.json()) as { message?: string };
    if (data.message) setMessage(data.message);
    await refresh();
  };

  const approve = async (proposalId: string) => {
    setActing(proposalId);
    const res = await fetch("/api/quiz-variants/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposalId }),
    });
    setActing(null);
    if (!res.ok) {
      setMessage("Approval failed");
      return;
    }
    setMessage("Variant approved — 50/50 A/B test is live.");
    await refresh();
  };

  const reject = async (proposalId: string) => {
    setActing(proposalId);
    await fetch("/api/quiz-variants/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposalId }),
    });
    setActing(null);
    setMessage("Proposal rejected.");
    await refresh();
  };

  const proposal = payload?.pendingProposal;
  const stats = payload?.stats;
  const experiment = payload?.experiment;
  const activeVariant = payload?.variants.find((v) => v.id === experiment?.testVariantId);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <FlaskConical className="size-5 text-violet-500" aria-hidden />
            Quiz variant experiments
          </h2>
          <p className="text-sm text-muted-foreground">
            AI proposes a reorganized quiz from funnel friction — you approve before traffic is split.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={proposing || Boolean(proposal)}
            onClick={() => void propose(false)}
          >
            {proposing ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <FlaskConical className="size-4" aria-hidden />
            )}
            Generate template proposal
          </Button>
          <AiGenerateButton
            aiAvailable={aiAvailable}
            source={null}
            generating={proposing}
            onGenerate={() => void propose(true)}
            label="Propose variant with AI"
          />
        </div>
      </div>

      {message ? (
        <p className="rounded-lg border border-border/60 bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}

      {loading && !payload ? (
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading experiments…
          </CardContent>
        </Card>
      ) : null}

      {proposal ? (
        <Card className="border-violet-500/30 bg-violet-500/5">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">{proposal.proposed.name}</CardTitle>
                <CardDescription>
                  Pending your validation · {proposal.confidence} confidence · expected{" "}
                  {proposal.expectedLift}
                </CardDescription>
              </div>
              <Badge variant="secondary">Awaiting approval</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="leading-relaxed text-muted-foreground">{proposal.rationale}</p>
            <p className="text-foreground">{proposal.proposed.description}</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border/70 bg-background/60 p-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Control
                </p>
                <p className="font-medium">{formatStepOrder(proposal.controlStepOrder)}</p>
              </div>
              <div className="rounded-lg border border-violet-500/40 bg-violet-500/10 p-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-violet-700 dark:text-violet-300">
                  Proposed variant
                </p>
                <p className="font-medium">{formatStepOrder(proposal.proposed.stepOrder)}</p>
                {proposal.proposed.tweaks?.showScoreTeaserOnContact ? (
                  <p className="mt-1 text-xs text-muted-foreground">+ score teaser on contact step</p>
                ) : null}
                {proposal.proposed.tweaks?.inlineConcernEducation ? (
                  <p className="mt-1 text-xs text-muted-foreground">+ inline concern education</p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                className="flex-1"
                disabled={acting === proposal.id}
                onClick={() => void approve(proposal.id)}
              >
                {acting === proposal.id ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Check className="size-4" aria-hidden />
                )}
                Approve & start 50/50 test
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={acting === proposal.id}
                onClick={() => void reject(proposal.id)}
              >
                <X className="size-4" aria-hidden />
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {experiment && activeVariant ? (
        <Card className="border-border/60 bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Live A/B test</CardTitle>
            <CardDescription>
              {Math.round(experiment.trafficSplit * 100)}% traffic to variant since{" "}
              {new Date(experiment.startedAt).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
              <span>Control: {formatStepOrder([1, 2, 3, 4])}</span>
              <ArrowRight className="size-4" aria-hidden />
              <span className="font-medium text-foreground">
                Variant: {formatStepOrder(activeVariant.stepOrder)}
              </span>
            </div>
            {stats ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border/70 p-3">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Control</p>
                  <p className="text-2xl font-semibold tabular-nums">{stats.control.completionRate}%</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.control.completed}/{stats.control.visitors} completed
                  </p>
                </div>
                <div
                  className={cn(
                    "rounded-lg border p-3",
                    stats.test.completionRate > stats.control.completionRate
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "border-border/70",
                  )}
                >
                  <p className="text-xs font-medium uppercase text-muted-foreground">Variant</p>
                  <p className="text-2xl font-semibold tabular-nums">{stats.test.completionRate}%</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.test.completed}/{stats.test.visitors} completed
                  </p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : !proposal ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="py-6 text-sm text-muted-foreground">
            No pending proposal. Generate one from the funnel AI analysis above when a hotspot appears.
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
