"use client";

import QuizVariantPanel from "@/components/QuizVariantPanel";

export default function DashboardExperiments() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Experiments
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Quiz variants and A/B performance — tune copy and flows without leaving the dashboard.
        </p>
      </div>
      <QuizVariantPanel />
    </div>
  );
}
