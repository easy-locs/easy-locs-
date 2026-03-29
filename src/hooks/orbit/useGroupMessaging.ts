/**
 * useGroupMessaging — Atomic: load, send, realtime for group chat messages.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { trackOrbitEvent } from "@/lib/orbit/orbitTelemetry";
import { sendText } from "@/families/send/send-text";
import { fetchGroupMessages } from "@/repositories/communication.repository";
import type { SendContext } from "@/families/send/send-context";

export interface GroupMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
  is_pinned?: boolean;
}

export function useGroupMessaging(activeGroupId: string | null, userId: string | undefined) {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async (groupId: string) => {
    const msgs = await fetchGroupMessages(groupId, 200);
    const mapped = ((msgs as any[]) || []).map((m: any) => ({
      id: m.id, sender_id: m.sender_user_id || m.sender_id,
      content: m.body || m.content, created_at: m.created_at,
      sender_name: m.sender_name, is_pinned: false,
    }));
    setMessages(mapped);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, []);

  const sendMessage = useCallback(async (groupId: string) => {
    if (!msgInput.trim() || !userId) return;
    const content = msgInput.trim();
    setMsgInput("");
    haptic("light");

    try {
      const { data: myOrbit } = await (supabase as any)
        .from("orbit_profiles_v2").select("orbit_id").eq("id", userId).maybeSingle();

      const ctx: SendContext = {
        conversationId: groupId,
        senderUserId: userId,
        senderOrbitId: myOrbit?.orbit_id || `orbit_${userId.slice(0, 12)}`,
      };
      const data = await sendText(ctx, content);

      if (data) {
        setMessages((prev) => prev.some((m) => m.id === data.id) ? prev : [...prev, {
          id: data.id, sender_id: data.sender_user_id, content: data.body, created_at: data.created_at, sender_name: "You", is_pinned: false,
        }]);
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to send message");
      setMsgInput(content);
    }
  }, [msgInput, userId]);

  // Realtime
  useEffect(() => {
    if (!activeGroupId) return;
    const channel = supabase
      .channel(`group-${activeGroupId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages_v2", filter: `conversation_id=eq.${activeGroupId}` }, (payload) => {
        const msg = payload.new as any;
        if (msg.sender_user_id !== userId) {
          setMessages((prev) => [...prev, { id: msg.id, sender_id: msg.sender_user_id, content: msg.body, created_at: msg.created_at, is_pinned: msg.is_pinned }]);
          setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        }
      })
      .subscribe();
    return () => { removeRealtimeChannel(channel); };
  }, [activeGroupId, userId]);

  return { messages, msgInput, setMsgInput, loadMessages, sendMessage, endRef };
}
