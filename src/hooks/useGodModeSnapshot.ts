/**
 * useGodModeSnapshot — Fetches a God Mode snapshot for the current user.
 * Persists activeRole across sessions via localStorage.
 */
import { useQuery } from "@tanstack/react-query";
import { useState, useCallback, useMemo } from "react";
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

  // Derive snapshot with role override applied locally (no refetch needed)
  const snapshotWithRole = useMemo(() => {
    if (!query.data) return null;
    if (roleOverride && query.data.identity.roles.includes(roleOverride) && query.data.identity.activeRole !== roleOverride) {
      return { ...query.data, identity: switchRole(query.data.identity, roleOverride) };
    }
    return query.data;
  }, [query.data, roleOverride]);

  return {
    ...query,
    data: snapshotWithRole,
    setActiveRole,
    activeRole: snapshotWithRole?.identity?.activeRole ?? roleOverride ?? "customer",
  };
}
