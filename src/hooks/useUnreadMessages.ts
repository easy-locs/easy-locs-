/**
 * useUnreadMessages — Realtime unread message counter for any role.
 * Subscribes to both Supabase realtime AND platform bus for fast cross-module sync.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { platformBus } from "@/lib/shared/platform-bus";

export function useUnreadMessages() {
  const { user, activeRole, orgId } = useAuth();
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!user) { setCount(0); return; }

    try {
      if (activeRole === "landlord" && orgId) {
        const { count: c } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("read", false)
          .neq("sender_id", user.id);
        setCount(c || 0);
      } else if (activeRole === "tenant") {
        const { data: tenants } = await supabase
          .from("tenants")
          .select("id")
          .eq("tenant_user_id", user.id)
          .limit(10);
        if (tenants && tenants.length > 0) {
          const tIds = tenants.map(t => t.id);
          const { count: c } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .in("tenant_id", tIds)
            .eq("read", false)
            .neq("sender_id", user.id);
          setCount(c || 0);
        } else {
          setCount(0);
        }
      } else if (activeRole === "client" && user.email) {
        const { count: c } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("contact_email", user.email.toLowerCase())
          .eq("read", false)
          .neq("sender_id", user.id);
        setCount(c || 0);
      }
    } catch {
      // Silently fail
    }
  }, [user, activeRole, orgId]);

  useEffect(() => {
    fetchCount();

    // Subscribe to realtime changes on messages table (scoped by org)
    const filter = orgId ? `org_id=eq.${orgId}` : undefined;
    const channel = supabase
      .channel("unread-messages-count")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", ...(filter ? { filter } : {}) }, () => {
        fetchCount();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", ...(filter ? { filter } : {}) }, () => {
        fetchCount();
      })
      .subscribe();

    // Also listen to platform bus for immediate cross-module refresh
    const unsubBus = platformBus.on("orbit:message_sent", () => {
      // Debounce slightly to let DB settle
      setTimeout(fetchCount, 500);
    });

    return () => {
      supabase.removeChannel(channel);
      unsubBus();
    };
  }, [fetchCount, orgId]);

  return { unreadCount: count, refresh: fetchCount };
}
