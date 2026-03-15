/**
 * useRealtimeManager — React hook that initializes the centralized RealtimeManager
 * on auth state changes, and provides the signal subscription API.
 * 
 * Mount ONCE at the app root (e.g., inside AuthProvider or App.tsx).
 * Replaces: useOrbitCallSync, usePresence, RealtimeMessageToast (as separate hooks).
 */
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitEngine } from "@/stores/orbit-engine";
import { realtimeManager, type RealtimeSignal } from "@/lib/realtime-manager";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";
import React from "react";

export function useRealtimeHub() {
  const { user, orgId, activeRole } = useAuth();
  const queryClient = useQueryClient();
  const refresh = useOrbitEngine((s) => s.refresh);
  const addAlert = useOrbitEngine((s) => s.addAlert);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMsgToast = useRef("");

  useEffect(() => {
    if (!user?.id) {
      realtimeManager.stop();
      return;
    }

    // Start or update the manager
    realtimeManager.start(user.id, orgId);

    const debouncedRefresh = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        refresh(user.id, orgId || undefined);
      }, 300);
    };

    // Register unified signal handler
    const unsub = realtimeManager.onSignal((signal: RealtimeSignal) => {
      const { table, eventType, new: row } = signal;

      // ─── Always refresh orbit engine on any change ───
      debouncedRefresh();

      // ─── Table-specific logic ───
      switch (table) {
        case "call_logs": {
          // Invalidate call-related queries
          queryClient.invalidateQueries({ queryKey: ["call-logs"] });
          // Missed call alert
          if (eventType === "UPDATE" && row?.status === "missed" && row.caller_id !== user.id) {
            addAlert({
              type: "warning",
              priority: 2,
              icon: "📞",
              title: "Appel manqué",
              message: "Vous avez manqué un appel",
              link: "/dashboard/communication?section=calls",
            });
          }
          break;
        }

        case "messages": {
          // Invalidate message queries
          queryClient.invalidateQueries({ queryKey: ["messages"] });
          queryClient.invalidateQueries({ queryKey: ["threads"] });

          // Toast for incoming messages (replaces RealtimeMessageToast)
          if (eventType === "INSERT" && row) {
            if (row.sender_id === user.id) break;
            if (row.sender_id === "00000000-0000-0000-0000-000000000000") break;
            if (row.id === lastMsgToast.current) break;
            lastMsgToast.current = row.id;

            let isRelevant = false;
            if (activeRole === "landlord" && orgId && row.org_id === orgId) isRelevant = true;
            else if (activeRole === "tenant" && row.tenant_id) isRelevant = true;
            else if (activeRole === "client" && user.email && row.contact_email?.toLowerCase() === user.email.toLowerCase()) isRelevant = true;

            if (isRelevant) {
              const senderName = row.contact_name || row.contact_email || "Someone";
              const preview = (row.content || "").slice(0, 80);
              toast(senderName, {
                description: preview || "New message",
                icon: React.createElement(MessageSquare, { className: "h-4 w-4" }),
                duration: 5000,
                action: {
                  label: "View",
                  onClick: () => {
                    const base = activeRole === "landlord" ? "/dashboard/communication" : activeRole === "tenant" ? "/tenant/messages" : "/client/messages";
                    window.location.href = base;
                  },
                },
              });
            }
          }
          break;
        }

        case "notifications": {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          if (eventType === "INSERT" && row && !row.read) {
            addAlert({
              type: "info",
              priority: 4,
              icon: "🔔",
              title: row.title || "Notification",
              message: (row.message || "").slice(0, 100),
              link: row.link || "/dashboard/settings",
            });
          }
          break;
        }

        case "booking_requests": {
          queryClient.invalidateQueries({ queryKey: ["booking-requests"] });
          if (eventType === "INSERT" && row) {
            addAlert({
              type: "action",
              priority: 1,
              icon: "📩",
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

        case "conversation_threads":
          queryClient.invalidateQueries({ queryKey: ["threads"] });
          queryClient.invalidateQueries({ queryKey: ["conversation-threads"] });
          break;
      }
    });

    return () => {
      unsub();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [user?.id, orgId, activeRole, refresh, addAlert, queryClient]);

  // Keep orgId in sync
  useEffect(() => {
    realtimeManager.setOrgId(orgId ?? null);
  }, [orgId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { realtimeManager.stop(); };
  }, []);
}
