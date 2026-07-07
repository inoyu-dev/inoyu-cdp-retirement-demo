import type {
  AiSummary,
  ProfileAiArtifact,
  VisitorProfile,
  VisitorProfileAiArtifacts,
} from "./types";
import { getProfile, updateProfile } from "./unomi-client";

export function getStoredSummary(
  profile: VisitorProfile,
): ProfileAiArtifact<AiSummary> | undefined {
  return profile.aiArtifacts?.summary;
}

export async function saveProfileSummary(
  profileId: string,
  summary: AiSummary,
  source: ProfileAiArtifact<AiSummary>["source"],
  sessionId?: string,
): Promise<VisitorProfile | null> {
  const profile = await getProfile(profileId, sessionId);
  if (!profile) return null;

  const artifact: ProfileAiArtifact<AiSummary> = {
    source,
    generatedAt: new Date().toISOString(),
    data: summary,
  };

  const aiArtifacts: VisitorProfileAiArtifacts = {
    ...profile.aiArtifacts,
    summary: artifact,
  };

  return updateProfile(profileId, { aiArtifacts }, sessionId);
}
