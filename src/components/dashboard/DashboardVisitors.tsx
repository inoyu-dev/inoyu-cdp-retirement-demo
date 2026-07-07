"use client";

import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ProfileListSidebar from "@/components/dashboard/ProfileListSidebar";
import VisitorProfileDetail from "@/components/dashboard/VisitorProfileDetail";
import { useDashboardProfiles } from "@/hooks/useDashboardProfiles";
import { useSelectedProfile } from "@/hooks/useSelectedProfile";
import { useProfileSummary } from "@/hooks/useProfileSummary";

function DashboardVisitorsInner() {
  const { profiles } = useDashboardProfiles();
  const { selected, setSelectedId } = useSelectedProfile(profiles);
  const {
    summary,
    loading: loadingSummary,
    generating: generatingSummary,
    aiAvailable,
    source: summarySource,
    generateWithAi,
  } = useProfileSummary(selected);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Visitors
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Pick a session to see profile data, AI brief, quiz behavior, and the full journey timeline.
          </p>
        </div>
        {selected ? (
          <Button
            variant="default"
            className="w-full gap-1.5 sm:w-auto"
            nativeButton={false}
            render={
              <Link href={`/follow-up?profileId=${selected.profileId}`} />
            }
          >
            View visitor follow-up
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,17rem)_1fr] xl:grid-cols-[minmax(0,19rem)_1fr]">
        <aside>
          <ProfileListSidebar
            profiles={profiles}
            selectedId={selected?.profileId ?? null}
            onSelect={setSelectedId}
            scrollClassName="h-[min(220px,32vh)] lg:h-[min(520px,60vh)]"
          />
        </aside>
        <main>
          {!selected ? (
            <Card className="border-dashed">
              <CardContent className="flex min-h-48 items-center justify-center py-12 text-muted-foreground">
                Waiting for a visitor…
              </CardContent>
            </Card>
          ) : (
            <VisitorProfileDetail
              profile={selected}
              summary={summary}
              loadingSummary={loadingSummary}
              aiAvailable={aiAvailable}
              summarySource={summarySource}
              generatingSummary={generatingSummary}
              onGenerateSummary={() => void generateWithAi()}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function DashboardVisitors() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading visitors…</p>}>
      <DashboardVisitorsInner />
    </Suspense>
  );
}
