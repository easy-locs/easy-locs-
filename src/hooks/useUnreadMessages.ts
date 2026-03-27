/**
 * useUnreadMessages — Canonical unread message counter.
 * Counts unread from BOTH:
 *   1. chat_messages_v2 (canonical V2 stack)
 *   2. messages (legacy stack — will be phased out)
 * Subscribes to realtime + platform bus for instant updates.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { platformBus } from "@/lib/shared/platform-bus";

const db = supabase as any;

export function useUnreadMessages() {
  const { user, activeRole, orgId } = useAuth();
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!user) { setCount(0); return; }

    try {
      let legacyCount = 0;
      let v2Count = 0;

      // ── V2 canonical: count unread in chat_messages_v2 ──
      const { count: v2c } = await db
        .from("chat_messages_v2")
        .select("id", { count: "exact", head: true })
        .is("read_at", null)
        .neq("sender_user_id", user.id);
      v2Count = v2c || 0;

      // ── Legacy: count unread in messages table ──
      if (activeRole === "landlord" && orgId) {
        const { count: c } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("read", false)
          .neq("sender_id", user.id);
        legacyCount = c || 0;
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
          legacyCount = c || 0;
        }
      } else if (activeRole === "client" && user.email) {
        const { count: c } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("contact_email", user.email.toLowerCase())
          .eq("read", false)
          .neq("sender_id", user.id);
        legacyCount = c || 0;
      }

      setCount(v2Count + legacyCount);
    } catch {
      // Silently fail
    }
  }, [user, activeRole, orgId]);

  useEffect(() => {
    fetchCount();

    // Realtime: legacy messages
    const filter = orgId ? `org_id=eq.${orgId}` : undefined;
    const channel = supabase
      .channel("unread-messages-count")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", ...(filter ? { filter } : {}) }, () => {
        fetchCount();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", ...(filter ? { filter } : {}) }, () => {
        fetchCount();
      })
      // V2 canonical messages
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages_v2" }, () => {
        fetchCount();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages_v2" }, () => {
        fetchCount();
      })
      .subscribe();

    // Platform bus for immediate cross-module refresh
    const unsubBus = platformBus.on("orbit:message_sent", () => {
      setTimeout(fetchCount, 500);
    });

    return () => {
      supabase.removeChannel(channel);
      unsubBus();
    };
  }, [fetchCount, orgId]);

  return { unreadCount: count, refresh: fetchCount };
}
