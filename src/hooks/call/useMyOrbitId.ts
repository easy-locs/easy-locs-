/**
 * useMyOrbitId — Resolves current user's orbit_id.
 * Single responsibility: fetch orbit profile identity.
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useMyOrbitId(userId: string | undefined) {
  const [myOrbitId, setMyOrbitId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    (supabase as any)
      .from("orbit_profiles_v2")
      .select("orbit_id")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.orbit_id) setMyOrbitId(data.orbit_id);
      });
  }, [userId]);

  return myOrbitId;
}
