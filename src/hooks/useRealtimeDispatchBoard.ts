/**
 * useRealtimeDispatchBoard — Canonical: reads from mobility_jobs.
 * DB calls delegated to dispatch-repository.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { fetchDispatchBoardData } from "@/repositories/dispatch-repository";

export function useRealtimeDispatchBoard() {
  const [state, setState] = useState({ rides: [] as any[], alerts: [] as any[], zones: [] as any[], loading: true });

  const load = useCallback(async () => {
    const data = await fetchDispatchBoardData();
    setState({ ...data, loading: false });
  }, []);

  useEffect(() => {
    load();
    const channel = createRealtimeChannel("dispatch-board-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "mobility_jobs" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_alerts" }, load)
      .subscribe();
    return () => { removeRealtimeChannel(channel); };
  }, [load]);

  return state;
}
