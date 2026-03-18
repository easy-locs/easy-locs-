/**
 * useCallParticipants — Live participant list for a call session.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToCallParticipants } from "@/lib/orbit/call-participants";

export function useCallParticipants(callSessionId?: string) {
  const [participants, setParticipants] = useState<any[]>([]);

  useEffect(() => {
    if (!callSessionId) return;
    let mounted = true;

    const load = () => {
      supabase
        .from("call_participants" as any)
        .select("*")
        .eq("call_session_id", callSessionId)
        .order("joined_at", { ascending: true })
        .then(({ data }) => {
          if (!mounted) return;
          setParticipants((data as any[]) ?? []);
        });
    };

    load();
    const sub = subscribeToCallParticipants(callSessionId, () => load());
    return () => { mounted = false; sub.unsubscribe(); };
  }, [callSessionId]);

  return participants;
}
