/**
 * useGodModeSnapshot — Fetches a God Mode snapshot for the current user.
 * Provides identity, wallet, loyalty, recommendations, journeys, tickets data.
 */
import { useQuery } from "@tanstack/react-query";
import { buildGodModeSnapshot, type GodModeSnapshot } from "@/lib/dino/godMode";

export function useGodModeSnapshot(userId: string | undefined) {
  return useQuery<GodModeSnapshot | null>({
    queryKey: ["god-mode-snapshot", userId],
    queryFn: async () => {
      if (!userId) return null;
      return buildGodModeSnapshot(userId);
    },
    enabled: !!userId,
    staleTime: 60_000,
    retry: 1,
  });
}
