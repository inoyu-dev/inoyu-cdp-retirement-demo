/** Resolve the Unomi profile id used for CDP context/events (stored id → app id → fallback). */
export function resolveUnomiContextProfileId(
  profile: { profileId?: string; unomiProfileId?: string } | null | undefined,
  fallbackProfileId?: string,
): string | undefined {
  const unomiId = profile?.unomiProfileId?.trim();
  if (unomiId) return unomiId;
  const appId = profile?.profileId?.trim() || fallbackProfileId?.trim();
  return appId || undefined;
}
