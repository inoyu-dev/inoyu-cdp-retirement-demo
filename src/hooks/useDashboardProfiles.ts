"use client";

import { useCallback, useEffect, useState } from "react";
import type { VisitorProfile } from "@/lib/types";

export function useDashboardProfiles(pollMs = 2000) {
  const [profiles, setProfiles] = useState<VisitorProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/profile", { cache: "no-store" });
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = (await res.json()) as { profiles: VisitorProfile[] };
    setProfiles(data.profiles);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    if (pollMs <= 0) return;
    const id = setInterval(() => void refresh(), pollMs);
    return () => clearInterval(id);
  }, [pollMs, refresh]);

  return { profiles, refresh, loading };
}
