/**
 * useUnreadMessages — Realtime unread message counter for any role.
 * Pro: counts unread where sender != user in org messages
 * Tenant: counts unread where tenant_id matches and sender != user
 * Client: counts unread where contact_email matches and sender != user
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useUnreadMessages() {
  const { user, activeRole, orgId } = useAuth();
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!user) { setCount(0); return; }

    try {
      if (activeRole === "landlord" && orgId) {
        // Pro: unread messages in org where sender is not user
        const { count: c } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("read", false)
          .neq("sender_id", user.id);
        setCount(c || 0);
      } else if (activeRole === "tenant") {
        // Tenant: messages where tenant_id links to user, sender != user
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
        // Client: messages where contact_email = user email
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

    // Subscribe to realtime changes on messages table
    const channel = supabase
      .channel("unread-messages-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        fetchCount();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchCount]);

  return { unreadCount: count, refresh: fetchCount };
}
