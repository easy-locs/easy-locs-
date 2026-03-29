/**
 * useMyOrbitId — Resolves current user's orbit_id.
 * Single responsibility: fetch orbit profile identity.
 * PHASE 2: No direct Supabase — uses repository.
 */
import { useState, useEffect } from "react";
import { resolveOrbitId } from "@/repositories/communication.repository";

export function useMyOrbitId(userId: string | undefined) {
  const [myOrbitId, setMyOrbitId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    resolveOrbitId(userId).then((oid) => {
      if (oid) setMyOrbitId(oid);
    });
  }, [userId]);

  return myOrbitId;
}
