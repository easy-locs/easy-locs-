/**
 * useRealtimeHub — Centralized React hook for RealtimeManager.
 * Mount ONCE at the app root. Replaces useOrbitCallSync, usePresence, RealtimeMessageToast.
 * 
 * v3: All tables migrated to V2 canonical (chat_messages_v2, app_notifications, conversations_v2).
 */
import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitEngine, type OrbitModule } from "@/stores/orbit-engine";
import { realtimeManager, type RealtimeSignal } from "@/lib/realtime-manager";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";
import React from "react";

// V3: Map V2 canonical tables to orbit modules
const TABLE_TO_MODULE: Record<string, OrbitModule> = {
  call_logs: "communication",
  chat_messages_v2: "communication",
  conversations_v2: "communication",
  app_notifications: "notifications",
  booking_requests: "business",
  concierge_orders: "business",
  deal_rooms: "business",
};

export function useRealtimeHub() {
  const { user, orgId, activeRole } = useAuth();
  const queryClient = useQueryClient();
  const refreshModule = useOrbitEngine((s) => s.refreshModule);
  const refresh = useOrbitEngine((s) => s.refresh);
  const addAlert = useOrbitEngine((s) => s.addAlert);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMsgToast = useRef("");

  const refreshModuleRef = useRef(refreshModule);
  refreshModuleRef.current = refreshModule;
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const addAlertRef = useRef(addAlert);
  addAlertRef.current = addAlert;

  const handleSignal = useCallback((signal: RealtimeSignal) => {
    const { table, eventType, new: row } = signal;

    // ─── Targeted module refresh ───
    const targetModule = TABLE_TO_MODULE[table];
    if (targetModule) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (user?.id) refreshModuleRef.current(targetModule, user.id, orgId || undefined);
      }, 500);
    }

    // ─── Table-specific targeted invalidation ───
    switch (table) {
      case "call_logs": {
        queryClient.invalidateQueries({ queryKey: ["call-logs"] });
        if (eventType === "UPDATE" && row?.status === "missed" && row.caller_orbit_id !== user?.id) {
          addAlertRef.current({
            type: "warning", priority: 2, icon: "📞",
            title: "Appel manqué", message: "Vous avez manqué un appel",
            link: "/dashboard/communication?section=calls",
          });
        }
        break;
      }

      case "chat_messages_v2": {
        queryClient.invalidateQueries({ queryKey: ["threads"] });
        queryClient.invalidateQueries({ queryKey: ["conversations-v2"] });

        if (eventType === "INSERT" && row) {
          if (row.sender_user_id === user?.id) break;
          if (row.id === lastMsgToast.current) break;
          lastMsgToast.current = row.id;

          const senderName = row.metadata?.sender_name || "Someone";
          const preview = (row.body || "").slice(0, 80);
          toast(senderName, {
            description: preview || "New message",
            icon: React.createElement(MessageSquare, { className: "h-4 w-4" }),
            duration: 5000,
            action: {
              label: "View",
              onClick: () => {
                window.location.href = `/orbit?conversation=${row.conversation_id}`;
              },
            },
          });
        }
        break;
      }

      case "app_notifications": {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        if (eventType === "INSERT" && row && !row.read_at) {
          addAlertRef.current({
            type: "info", priority: 4, icon: "🔔",
            title: row.title || "Notification",
            message: (row.body || "").slice(0, 100),
            link: row.route || "/dashboard/settings",
          });
        }
        break;
      }

      case "booking_requests": {
        queryClient.invalidateQueries({ queryKey: ["booking-requests"] });
        if (eventType === "INSERT" && row) {
          addAlertRef.current({
            type: "action", priority: 1, icon: "📩",
            title: "Nouvelle réservation",
            message: `${row.guest_name || "Client"} — ${row.check_in || ""}`,
            link: "/dashboard/seasonal",
          });
        }
        break;
      }

      case "concierge_orders":
        queryClient.invalidateQueries({ queryKey: ["concierge-orders"] });
        break;

      case "deal_rooms":
        queryClient.invalidateQueries({ queryKey: ["deals"] });
        queryClient.invalidateQueries({ queryKey: ["deal-rooms"] });
        break;

      case "conversations_v2":
        queryClient.invalidateQueries({ queryKey: ["threads"] });
        queryClient.invalidateQueries({ queryKey: ["conversations-v2"] });
        break;
    }
  }, [user?.id, user?.email, orgId, activeRole, queryClient]);

  useEffect(() => {
    if (!user?.id) {
      realtimeManager.stop();
      return;
    }

    realtimeManager.start(user.id, orgId);
    const unsub = realtimeManager.onSignal(handleSignal);

    return () => {
      unsub();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [user?.id, orgId, handleSignal]);

  // Keep orgId in sync
  useEffect(() => {
    realtimeManager.setOrgId(orgId ?? null);
  }, [orgId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { realtimeManager.stop(); };
  }, []);
}
