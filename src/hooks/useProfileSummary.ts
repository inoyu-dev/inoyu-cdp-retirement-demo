"use client";

import { useCallback, useEffect, useState } from "react";
import type { AiContentSource } from "@/components/AiGenerateButton";
import { useIntegrationsHealth } from "@/hooks/useIntegrationsHealth";
import { withSessionQuery } from "@/lib/session-id";
import type { AiSummary, VisitorProfile } from "@/lib/types";

function profileKey(profile: VisitorProfile | null): string | null {
  if (!profile?.profileId) return null;
  return `${profile.profileId}:${profile.updatedAt}:${profile.events.length}`;
}

function summaryUrl(profileId: string, mode: AiContentSource | "stored", sessionId?: string): string {
  const base = `/api/summary?profileId=${encodeURIComponent(profileId)}&source=${mode}`;
  return withSessionQuery(base, sessionId);
}

export function useProfileSummary(profile: VisitorProfile | null) {
  const { health } = useIntegrationsHealth();
  const aiAvailable = health?.openai.ok ?? false;
  const sessionId = profile?.sessionId;

  const [summary, setSummary] = useState<AiSummary | null>(null);
  const [source, setSource] = useState<AiContentSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchSummary = useCallback(async (profileId: string, mode: AiContentSource | "stored") => {
    const res = await fetch(summaryUrl(profileId, mode, sessionId), { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as { summary: AiSummary; source: AiContentSource };
  }, [sessionId]);

  const loadInitial = useCallback(async () => {
    if (!profileKey(profile) || !profile?.profileId) {
      setSummary(null);
      setSource(null);
      return;
    }
    setLoading(true);
    const stored = await fetchSummary(profile.profileId, "stored");
    if (stored) {
      setSummary(stored.summary);
      setSource(stored.source);
    } else {
      const template = await fetchSummary(profile.profileId, "template");
      if (template) {
        setSummary(template.summary);
        setSource(template.source);
      }
    }
    setLoading(false);
  }, [profile, fetchSummary]);

  const generateWithAi = useCallback(async () => {
    if (!profile?.profileId || !aiAvailable) return;
    setGenerating(true);
    const data = await fetchSummary(profile.profileId, "ai");
    if (data) {
      setSummary(data.summary);
      setSource(data.source);
    }
    setGenerating(false);
  }, [profile?.profileId, aiAvailable, fetchSummary]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  return {
    summary,
    source,
    loading,
    generating,
    aiAvailable,
    generateWithAi,
    reloadTemplate: loadInitial,
  };
}

export function useProfileSummaryById(profileId: string | null, refreshKey = "", sessionId = "") {
  const { health } = useIntegrationsHealth();
  const aiAvailable = health?.openai.ok ?? false;

  const [summary, setSummary] = useState<AiSummary | null>(null);
  const [source, setSource] = useState<AiContentSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchSummary = useCallback(async (id: string, mode: AiContentSource | "stored") => {
    const res = await fetch(summaryUrl(id, mode, sessionId), { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as { summary: AiSummary; source: AiContentSource };
  }, [sessionId]);

  const loadInitial = useCallback(async () => {
    if (!profileId) {
      setSummary(null);
      setSource(null);
      return;
    }
    setLoading(true);
    const stored = await fetchSummary(profileId, "stored");
    if (stored) {
      setSummary(stored.summary);
      setSource(stored.source);
    } else {
      const template = await fetchSummary(profileId, "template");
      if (template) {
        setSummary(template.summary);
        setSource(template.source);
      }
    }
    setLoading(false);
  }, [profileId, refreshKey, fetchSummary]);

  const generateWithAi = useCallback(async () => {
    if (!profileId || !aiAvailable) return;
    setGenerating(true);
    const data = await fetchSummary(profileId, "ai");
    if (data) {
      setSummary(data.summary);
      setSource(data.source);
    }
    setGenerating(false);
  }, [profileId, aiAvailable, fetchSummary]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  return {
    summary,
    source,
    loading,
    generating,
    aiAvailable,
    generateWithAi,
    reloadTemplate: loadInitial,
  };
}
