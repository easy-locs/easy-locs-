/**
 * useGroupChat — manages active group chat state: messages, members, realtime.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { haptic } from "@/lib/haptics";
import { trackOrbitEvent } from "@/lib/orbit/orbitTelemetry";
import type { Group, GroupMember, GroupMessage } from "./types";

export function useGroupChat() {
  const { user } = useAuth();
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const refreshMembers = useCallback(async (groupId: string) => {
    const { data: mems } = await supabase.from("group_members").select("*").eq("group_id", groupId);
    setMembers((mems as GroupMember[]) || []);
  }, []);

  const openGroupChat = useCallback(async (group: Group) => {
    trackOrbitEvent("orbit.group.joined", { screen: "groups", component: "CommGroupsSection", action: "open_group", payload: { groupId: group.id, type: group.group_type }, result: "success" });
    setActiveGroup(group);
    haptic("light");

    const { data: msgs } = await (supabase as any)
      .from("chat_messages_v2")
      .select("*")
      .eq("conversation_id", group.id)
      .order("created_at", { ascending: true })
      .limit(200);

    const mapped = ((msgs as any[]) || []).map((m: any) => ({
      id: m.id,
      sender_id: m.sender_user_id || m.sender_id,
      content: m.body || m.content,
      created_at: m.created_at,
      sender_name: m.sender_name,
      is_pinned: false,
    }));
    setMessages(mapped as GroupMessage[]);
    await refreshMembers(group.id);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [refreshMembers]);

  const closeChat = useCallback(() => setActiveGroup(null), []);

  const appendMessage = useCallback((msg: GroupMessage) => {
    setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  // Realtime subscription
  useEffect(() => {
    if (!activeGroup) return;
    const channel = supabase
      .channel(`group-${activeGroup.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages_v2",
        filter: `conversation_id=eq.${activeGroup.id}`,
      }, (payload) => {
        const msg = payload.new as any;
        if (msg.sender_user_id !== user?.id) {
          appendMessage({
            id: msg.id,
            sender_id: msg.sender_user_id,
            content: msg.body,
            created_at: msg.created_at,
            is_pinned: msg.is_pinned,
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeGroup?.id, user?.id, appendMessage]);

  // Derived state
  const myMember = members.find(m => m.user_id === user?.id);
  const isAdmin = myMember?.role === "admin";
  const isViewer = myMember?.role === "viewer";
  const canPost = activeGroup
    ? activeGroup.posting_permission === "everyone" ? !isViewer : isAdmin
    : false;
  const pinnedMessages = messages.filter(m => m.is_pinned);

  return {
    activeGroup, messages, members, messagesEndRef,
    openGroupChat, closeChat, appendMessage, refreshMembers,
    myMember, isAdmin, isViewer, canPost, pinnedMessages,
    setMembers,
  };
}
