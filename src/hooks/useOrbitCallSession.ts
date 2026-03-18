/**
 * useOrbitCallSession — Hook for managing Orbit call sessions with realtime updates.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  createCallSession,
  startCallSession,
  endCallSession,
  declineCallSession,
} from "@/lib/orbit/call-session";

export function useOrbitCallSession(params: {
  threadId?: string | null;
  initiatorId: string;
  recipientId?: string | null;
}) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const create = useCallback(async (callType: "voice" | "video") => {
    setLoading(true);
    try {
      const data = await createCallSession({
        threadId: params.threadId,
        initiatorId: params.initiatorId,
        recipientId: params.recipientId,
        callType,
      });
      setSession(data);
      return data;
    } finally {
      setLoading(false);
    }
  }, [params.threadId, params.initiatorId, params.recipientId]);

  const accept = useCallback(async () => {
    if (!session?.id) return;
    await startCallSession(session.id);
    setSession((prev: any) => prev ? { ...prev, status: "active", started_at: new Date().toISOString() } : prev);
  }, [session]);

  const end = useCallback(async () => {
    if (!session?.id) return;
    await endCallSession(session.id, session.started_at);
    setSession((prev: any) => prev ? { ...prev, status: "ended" } : prev);
  }, [session]);

  const decline = useCallback(async () => {
    if (!session?.id) return;
    await declineCallSession(session.id);
    setSession((prev: any) => prev ? { ...prev, status: "declined" } : prev);
  }, [session]);

  useEffect(() => {
    if (!session?.id) return;

    const channel = supabase
      .channel(`call-session:${session.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "call_sessions", filter: `id=eq.${session.id}` },
        (payload) => setSession(payload.new),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.id]);

  return { session, loading, create, accept, end, decline };
}
