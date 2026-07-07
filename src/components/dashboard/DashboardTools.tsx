"use client";

import { Suspense } from "react";
import AiUsageCostPanel from "@/components/AiUsageCostPanel";
import DashboardAgentChat from "@/components/DashboardAgentChat";
import MarketerSmsSimulator from "@/components/MarketerSmsSimulator";
import ProfileListSidebar from "@/components/dashboard/ProfileListSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { useDashboardProfiles } from "@/hooks/useDashboardProfiles";
import { useSelectedProfile } from "@/hooks/useSelectedProfile";

function DashboardToolsInner() {
  const { profiles } = useDashboardProfiles();
  const { selected, setSelectedId } = useSelectedProfile(profiles);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          AI & tools
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Token usage estimates, Unomi agent chat, and SMS follow-up simulation — pick a visitor to target actions.
        </p>
      </div>

      <AiUsageCostPanel />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,17rem)_1fr] xl:grid-cols-[minmax(0,19rem)_1fr]">
        <aside>
          <ProfileListSidebar
            profiles={profiles}
            selectedId={selected?.profileId ?? null}
            onSelect={setSelectedId}
            scrollClassName="h-[min(320px,40vh)]"
          />
        </aside>
        <main className="min-w-0 space-y-6">
          {!selected ? (
            <Card className="border-dashed">
              <CardContent className="flex min-h-32 items-center justify-center py-10 text-muted-foreground">
                Select a visitor to use agent chat and SMS tools.
              </CardContent>
            </Card>
          ) : (
            <>
              <DashboardAgentChat
                profileId={selected.profileId}
                sessionId={selected.sessionId}
                profileName={selected.quiz?.firstName ?? undefined}
              />
              <MarketerSmsSimulator
                profileId={selected.profileId}
                sessionId={selected.sessionId}
                profileName={selected.quiz?.firstName ?? undefined}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function DashboardTools() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading tools…</p>}>
      <DashboardToolsInner />
    </Suspense>
  );
}
