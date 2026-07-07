import type { VisitorProfile } from "./types";

/** Prefer completed quizzes, known names, then newest update. */
export function isProfileRicher(candidate: VisitorProfile, current: VisitorProfile): boolean {
  if (candidate.quiz?.completedAt && !current.quiz?.completedAt) return true;
  if (current.quiz?.completedAt && !candidate.quiz?.completedAt) return false;
  if (candidate.quiz?.firstName?.trim() && !current.quiz?.firstName?.trim()) return true;
  if (current.quiz?.firstName?.trim() && !candidate.quiz?.firstName?.trim()) return false;
  return new Date(candidate.updatedAt).getTime() > new Date(current.updatedAt).getTime();
}

export function mergeVisitorProfiles(a: VisitorProfile, b: VisitorProfile): VisitorProfile {
  const primary = isProfileRicher(a, b) ? a : b;
  const secondary = primary === a ? b : a;
  const updatedAt = new Date(
    Math.max(new Date(primary.updatedAt).getTime(), new Date(secondary.updatedAt).getTime()),
  ).toISOString();

  return {
    ...secondary,
    ...primary,
    profileId: primary.profileId,
    sessionId: primary.sessionId,
    unomiProfileId: primary.unomiProfileId ?? secondary.unomiProfileId,
    quiz: primary.quiz ?? secondary.quiz,
    leadScore: Math.max(primary.leadScore ?? 0, secondary.leadScore ?? 0),
    pageViews: Math.max(primary.pageViews ?? 0, secondary.pageViews ?? 0),
    segments: [...new Set([...(primary.segments ?? []), ...(secondary.segments ?? [])])],
    events:
      (primary.events?.length ?? 0) >= (secondary.events?.length ?? 0)
        ? primary.events
        : secondary.events,
    contentEngagement: primary.contentEngagement ?? secondary.contentEngagement,
    quizEngagement: primary.quizEngagement ?? secondary.quizEngagement,
    quizFunnel: primary.quizFunnel ?? secondary.quizFunnel,
    quizChat: primary.quizChat ?? secondary.quizChat,
    aiArtifacts: primary.aiArtifacts ?? secondary.aiArtifacts,
    updatedAt,
  };
}

/** Collapse duplicate Unomi rows that share a profileId or browser sessionId. */
export function dedupeVisitorProfiles(profiles: VisitorProfile[]): VisitorProfile[] {
  const byId = new Map<string, VisitorProfile>();
  for (const profile of profiles) {
    const existing = byId.get(profile.profileId);
    byId.set(profile.profileId, existing ? mergeVisitorProfiles(existing, profile) : profile);
  }

  const bySession = new Map<string, VisitorProfile>();
  for (const profile of byId.values()) {
    const existing = bySession.get(profile.sessionId);
    bySession.set(profile.sessionId, existing ? mergeVisitorProfiles(existing, profile) : profile);
  }

  return [...bySession.values()].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}
