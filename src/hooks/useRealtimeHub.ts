/**
 * useRealtimeHub — Centralized React hook for RealtimeManager.
 * Mount ONCE at the app root. Replaces useOrbitCallSync, usePresence, RealtimeMessageToast.
 * 
 * v4: Per-module debounce + platformBus emission from realtime signals.
 */
import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitEngine, type OrbitModule } from "@/stores/orbit-engine";
import { realtimeManager, type RealtimeSignal } from "@/lib/realtime-manager";
import { platformBus } from "@/lib/shared/platform-bus";
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

// Map table+eventType to platformBus events for canonical bridge propagation
const TABLE_TO_PLATFORM_EVENT: Record<string, Record<string, string>> = {
  chat_messages_v2: {
    INSERT: "orbit:message_received",
    UPDATE: "orbit:message_read",
  },
  conversations_v2: {
    INSERT: "orbit:thread_created",
    UPDATE: "orbit:thread_updated",
  },
  call_logs: {
    INSERT: "orbit:call_started",
    UPDATE: "orbit:call_ended",
  },
  app_notifications: {
    INSERT: "notifications:refresh",
    UPDATE: "notifications:refresh",
  },
  booking_requests: {
    INSERT: "marketplace:booking_created",
    UPDATE: "marketplace:booking_confirmed",
  },
};

export function useRealtimeHub() {
  const { user, orgId, activeRole } = useAuth();
  const queryClient = useQueryClient();
  const refreshModule = useOrbitEngine((s) => s.refreshModule);
  const refresh = useOrbitEngine((s) => s.refresh);
  const addAlert = useOrbitEngine((s) => s.addAlert);
  const lastMsgToast = useRef("");

  // FIX: Per-module debounce timers instead of single shared timer
  const moduleTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const refreshModuleRef = useRef(refreshModule);
  refreshModuleRef.current = refreshModule;
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const addAlertRef = useRef(addAlert);
  addAlertRef.current = addAlert;

  const handleSignal = useCallback((signal: RealtimeSignal) => {
    const { table, eventType, new: row } = signal;

    // ─── FIX: Emit platformBus event so canonical bridges react ───
    const eventMap = TABLE_TO_PLATFORM_EVENT[table];
    if (eventMap) {
      const platformEvent = eventMap[eventType] || eventMap["*"];
      if (platformEvent) {
        platformBus.emit(
          platformEvent as any,
          { table, eventType, id: row?.id, userId: user?.id },
          "system"
        );
      }
    }

    // ─── FIX: Per-module debounce (each module gets its own timer) ───
    const targetModule = TABLE_TO_MODULE[table];
    if (targetModule) {
      const timerKey = targetModule;
      if (moduleTimers.current[timerKey]) clearTimeout(moduleTimers.current[timerKey]);
      moduleTimers.current[timerKey] = setTimeout(() => {
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
      // Clear all per-module timers
      Object.values(moduleTimers.current).forEach(clearTimeout);
      moduleTimers.current = {};
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
