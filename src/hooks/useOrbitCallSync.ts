/**
 * useOrbitCallSync — Global realtime listener for Orbit badge sync.
 * Monitors: call_logs, messages, notifications, booking_requests, 
 * concierge_orders, deal_rooms, marketplace_services.
 * Ensures all Orbit cards and counters stay synchronized in real time.
 */
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrbitEngine } from "@/stores/orbit-engine";
import { useAuth } from "@/contexts/AuthContext";

export function useOrbitCallSync() {
  const { user, orgId } = useAuth();
  const refresh = useOrbitEngine((s) => s.refresh);
  const addAlert = useOrbitEngine((s) => s.addAlert);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const debouncedRefresh = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        refresh(user.id, orgId || undefined);
      }, 300);
    };

    const channelName = `orbit-global-sync-${user.id}`;
    const channel = supabase
      .channel(channelName)
      // ── Call logs (incoming + outgoing) ──
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_logs" },
        (payload) => {
          const row = payload.new as any;
          if (!row) return;
          debouncedRefresh();

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
      // ── Messages ──
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => debouncedRefresh()
      )
      // ── Notifications ──
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          debouncedRefresh();
          // Surface new notification as Orbit alert
          if (payload.eventType === "INSERT") {
            const n = payload.new as any;
            if (n && !n.read) {
              addAlert({
                type: "info",
                priority: 4,
                icon: "🔔",
                title: n.title || "Notification",
                message: (n.message || "").slice(0, 100),
                link: n.link || "/dashboard/settings",
              });
            }
          }
        }
      )
      // ── Booking requests ──
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "booking_requests", ...(orgId ? { filter: `org_id=eq.${orgId}` } : {}) },
        (payload) => {
          debouncedRefresh();
          if (payload.eventType === "INSERT") {
            const b = payload.new as any;
            addAlert({
              type: "action",
              priority: 1,
              icon: "📩",
              title: "Nouvelle réservation",
              message: `${b?.guest_name || "Client"} — ${b?.check_in || ""}`,
              link: "/dashboard/seasonal",
            });
          }
        }
      )
      // ── Concierge orders ──
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "concierge_orders", ...(orgId ? { filter: `org_id=eq.${orgId}` } : {}) },
        () => debouncedRefresh()
      )
      // ── Deal rooms ──
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deal_rooms", ...(orgId ? { filter: `org_id=eq.${orgId}` } : {}) },
        () => debouncedRefresh()
      )
      // ── Conversation threads ──
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_threads", ...(orgId ? { filter: `org_id=eq.${orgId}` } : {}) },
        () => debouncedRefresh()
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [user?.id, orgId, refresh, addAlert]);
}
