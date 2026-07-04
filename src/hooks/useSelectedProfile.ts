"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { VisitorProfile } from "@/lib/types";

export function useSelectedProfile(profiles: VisitorProfile[]) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const profileIdFromUrl = searchParams.get("profileId");

  const selected = useMemo(() => {
    if (profileIdFromUrl) {
      return profiles.find((p) => p.profileId === profileIdFromUrl) ?? profiles[0] ?? null;
    }
    return profiles[0] ?? null;
  }, [profileIdFromUrl, profiles]);

  const setSelectedId = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("profileId", id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { selected, setSelectedId, profileIdFromUrl };
}
