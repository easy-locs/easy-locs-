/**
 * useIncomingCalls — Realtime hook for incoming call sessions.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CallSessionRecord } from "@/lib/calls/call-types";

export function useIncomingCalls(userId: string | null) {
  const [incoming, setIncoming] = useState<CallSessionRecord[]>([]);

  useEffect(() => {
    if (!userId) return;

    let mounted = true;

    const load = async () => {
      const { data } = await (supabase as any)
        .from("orbit_call_sessions")
        .select("*")
        .eq("callee_user_id", userId)
        .eq("status", "ringing")
        .order("created_at", { ascending: false });

      if (mounted) setIncoming((data ?? []) as CallSessionRecord[]);
    };

    load();

    const channel = supabase
      .channel(`incoming-calls:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orbit_call_sessions",
          filter: `callee_user_id=eq.${userId}`,
        },
        () => load()
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { incoming };
}
