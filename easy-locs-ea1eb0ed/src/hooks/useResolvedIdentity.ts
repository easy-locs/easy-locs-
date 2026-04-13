/**
 * useResolvedIdentity — Canonical hook for resolving display identity from any entity shape.
 * Caches results per entity key to avoid repeated computation.
 * Use this instead of inline identity resolution in components.
 */
import { useMemo } from "react";
import { resolveCanonicalDisplayIdentity, type CanonicalDisplayIdentity } from "@/lib/orbit/canonical-helpers";

/**
 * Resolve display identity from any entity-like object.
 * Accepts thread, contact, profile, or raw shapes.
 */
export function useResolvedIdentity(entity: {
  display_name?: string | null;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  company?: string | null;
  role?: string | null;
  id?: string | null;
  user_id?: string | null;
  orbit_id?: string | null;
  username?: string | null;
} | null | undefined): CanonicalDisplayIdentity {
  return useMemo(() => {
    if (!entity) {
      return {
        displayName: "Contact",
        subtitle: "",
        avatarUrl: null,
        initials: "?",
        canonicalUserId: null,
        canonicalOrbitId: null,
      };
    }
    return resolveCanonicalDisplayIdentity(entity);
  }, [
    entity?.display_name,
    entity?.name,
    entity?.first_name,
    entity?.last_name,
    entity?.username,
    entity?.email,
    entity?.phone,
    entity?.avatar_url,
    entity?.avatarUrl,
    entity?.id,
  ]);
}
