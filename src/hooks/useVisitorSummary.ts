"use client";

import { useEffect, useState } from "react";
import type { AiSummary, VisitorProfile } from "@/lib/types";

export function useVisitorSummary(profile: VisitorProfile | null) {
  const [summary, setSummary] = useState<AiSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    if (!profile?.profileId) {
      setSummary(null);
      return;
    }
    let cancelled = false;
    setLoadingSummary(true);
    void (async () => {
      const res = await fetch(
        `/api/summary?profileId=${encodeURIComponent(profile.profileId)}`,
        { cache: "no-store" },
      );
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as { summary: AiSummary };
      if (!cancelled) setSummary(data.summary);
      if (!cancelled) setLoadingSummary(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.profileId, profile?.updatedAt, profile?.events.length]);

  return { summary, loadingSummary };
}
