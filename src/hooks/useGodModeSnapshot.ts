/**
 * useGodModeSnapshot — Fetches a God Mode snapshot for the current user.
 * Persists activeRole across sessions via localStorage.
 */
import { useQuery } from "@tanstack/react-query";
import { useState, useCallback, useEffect } from "react";
import { buildGodModeSnapshot, type GodModeSnapshot } from "@/lib/dino/godMode";
import { switchRole, type UniversalRole } from "@/lib/dino/universalIdentity";

const ACTIVE_ROLE_KEY = "dino_active_role";

export function useGodModeSnapshot(userId: string | undefined) {
  const [roleOverride, setRoleOverride] = useState<UniversalRole | null>(() => {
    try {
      return (localStorage.getItem(ACTIVE_ROLE_KEY) as UniversalRole) || null;
    } catch { return null; }
  });

  const query = useQuery<GodModeSnapshot | null>({
    queryKey: ["god-mode-snapshot", userId],
    queryFn: async () => {
      if (!userId) return null;
      const snapshot = await buildGodModeSnapshot(userId);
      // Restore persisted role if valid
      if (roleOverride && snapshot.identity.roles.includes(roleOverride)) {
        return { ...snapshot, identity: switchRole(snapshot.identity, roleOverride) };
      }
      return snapshot;
    },
    enabled: !!userId,
    staleTime: 60_000,
    retry: 1,
  });

  const setActiveRole = useCallback((role: UniversalRole) => {
    setRoleOverride(role);
    try { localStorage.setItem(ACTIVE_ROLE_KEY, role); } catch {}
  }, []);

  // Keep snapshot identity in sync with role override
  useEffect(() => {
    if (roleOverride && query.data?.identity && query.data.identity.activeRole !== roleOverride) {
      if (query.data.identity.roles.includes(roleOverride)) {
        // Trigger refetch to apply role
        query.refetch();
      }
    }
  }, [roleOverride]);

  return {
    ...query,
    setActiveRole,
    activeRole: query.data?.identity?.activeRole ?? roleOverride ?? "customer",
  };
}
