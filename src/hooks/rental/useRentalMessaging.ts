/**
 * useRentalMessaging — Atomic: tenant messaging (load, send, realtime).
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useRentalMessaging(orgId: string | null, tenantId: string | null, userId: string | undefined) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");

  const loadMessages = useCallback(async () => {
    if (!orgId || !tenantId) return;
    const contextId = `tenant_${orgId}_${tenantId}`;
    const { data } = await (supabase as any)
      .from("chat_messages_v2")
      .select("*")
      .eq("conversation_id", contextId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  }, [orgId, tenantId]);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !tenantId || !orgId || !userId) return;
    const body = newMessage.trim();
    const contextId = `tenant_${orgId}_${tenantId}`;
    const { error } = await (supabase as any).from("chat_messages_v2").insert({
      conversation_id: contextId,
      sender_user_id: userId,
      sender_orbit_id: `orbit_${userId.slice(0, 12)}`,
      type: "text",
      body,
    });
    if (!error) {
      setNewMessage("");
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), conversation_id: contextId, sender_user_id: userId, body, created_at: new Date().toISOString() }]);
    }
    return error;
  }, [newMessage, tenantId, orgId, userId]);

  // Realtime listener
  useEffect(() => {
    if (!orgId || !tenantId) return;
    const channel = supabase
      .channel(`rental-msg-${tenantId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages_v2" }, (payload) => {
        const msg = payload.new as any;
        if (msg.metadata?.tenant_id === tenantId || msg.conversation_id?.includes(tenantId)) {
          setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages_v2" }, (payload) => {
        const updated = payload.new as any;
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, tenantId]);

  return { messages, newMessage, setNewMessage, loadMessages, sendMessage };
}
