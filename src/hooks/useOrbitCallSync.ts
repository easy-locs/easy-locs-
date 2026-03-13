/**
 * useOrbitCallSync — Realtime listener on call_logs for instant Orbit badge updates.
 * Refreshes orbit engine counters when call events occur.
 */
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrbitEngine } from "@/stores/orbit-engine";
import { useAuth } from "@/contexts/AuthContext";

export function useOrbitCallSync() {
  const { user, orgId } = useAuth();
  const refresh = useOrbitEngine((s) => s.refresh);
  const addAlert = useOrbitEngine((s) => s.addAlert);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("orbit-call-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_logs" },
        (payload) => {
          const row = payload.new as any;
          if (!row) return;

          // Refresh counters on any call status change
          refresh(user.id, orgId || undefined);

          // Surface missed call alert immediately
          if (
            payload.eventType === "UPDATE" &&
            row.status === "missed" &&
            row.caller_id !== user.id
          ) {
            addAlert({
              type: "warning",
              priority: 2,
              icon: "📞",
              title: "Appel manqué",
              message: "Vous avez manqué un appel",
              link: "/dashboard/communication?section=calls",
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          // Refresh on new messages too for badge sync
          refresh(user.id, orgId || undefined);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, orgId, refresh, addAlert]);
}
