/**
 * useLiveTranslationStream — Realtime live translation chunks for a call session.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useLiveTranslationStream(callSessionId?: string) {
  const [chunks, setChunks] = useState<any[]>([]);

  useEffect(() => {
    if (!callSessionId) return;
    let mounted = true;

    supabase
      .from("live_translation_stream" as any)
      .select("*")
      .eq("call_session_id", callSessionId)
      .order("created_at", { ascending: true })
      .limit(200)
      .then(({ data }) => {
        if (!mounted) return;
        setChunks((data as any[]) ?? []);
      });

    const sub = supabase
      .channel(`translation:${callSessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_translation_stream",
          filter: `call_session_id=eq.${callSessionId}`,
        },
        (payload) => setChunks((prev) => [...prev, payload.new])
      )
      .subscribe();

    return () => { mounted = false; sub.unsubscribe(); };
  }, [callSessionId]);

  return chunks;
}
