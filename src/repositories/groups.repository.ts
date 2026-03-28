/**
 * Groups Repository — All group/channel/community DB operations.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchUserGroupIds(userId: string) {
  const { data, error } = await supabase.from("group_members").select("group_id").eq("user_id", userId);
  if (error) throw error;
  return (data || []).map((r: any) => r.group_id).filter(Boolean);
}

export async function fetchConversationsByTypes(types: string[]) {
  const { data, error } = await (supabase as any).from("conversations_v2").select("*").in("type", types).order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchGroupMemberCount(groupId: string) {
  const { count } = await supabase.from("group_members").select("*", { count: "exact", head: true }).eq("group_id", groupId);
  return count || 0;
}

export async function fetchLastMessage(conversationId: string) {
  const { data } = await (supabase as any).from("chat_messages_v2").select("body, created_at").eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(1);
  return data?.[0] || null;
}

export async function fetchGroupMembers(groupId: string) {
  const { data } = await supabase.from("group_members").select("*").eq("group_id", groupId);
  return data || [];
}

export async function fetchGroupMessages(conversationId: string, limit = 200) {
  const { data } = await (supabase as any).from("chat_messages_v2").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(limit);
  return data || [];
}

export async function fetchOrbitProfile(userId: string) {
  const { data } = await (supabase as any).from("orbit_profiles_v2").select("orbit_id, display_name, email, avatar_url").eq("id", userId).maybeSingle();
  return data;
}

export async function createConversation(payload: Record<string, any>) {
  const { data, error } = await (supabase as any).from("conversations_v2").insert(payload).select("id, type, title, created_at, created_by_orbit_id").single();
  if (error) throw error;
  return data;
}

export async function insertGroupMember(groupId: string, userId: string, role: string) {
  const { error } = await supabase.from("group_members").insert({ group_id: groupId, user_id: userId, role } as any);
  if (error) throw error;
}

export async function insertChatMessage(payload: Record<string, any>) {
  const { data, error } = await (supabase as any).from("chat_messages_v2").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateConversation(id: string, payload: Record<string, any>) {
  const { error } = await (supabase as any).from("conversations_v2").update(payload).eq("id", id);
  if (error) throw error;
}

export async function fetchConversationParticipants(id: string) {
  const { data } = await (supabase as any).from("conversations_v2").select("participants").eq("id", id).single();
  return data;
}

export async function updateGroupMemberRole(memberId: string, role: string) {
  const { error } = await supabase.from("group_members").update({ role } as any).eq("id", memberId);
  if (error) throw error;
}

export async function deleteGroupMember(memberId: string) {
  await supabase.from("group_members").delete().eq("id", memberId);
}

export async function deleteGroupMemberByUser(groupId: string, userId: string) {
  await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId);
}

export async function deleteConversation(id: string) {
  await (supabase as any).from("conversations_v2").delete().eq("id", id);
}

export async function deleteGroupMembers(groupId: string) {
  await supabase.from("group_members").delete().eq("group_id", groupId);
}

export async function fetchProfileByEmail(email: string) {
  const { data } = await supabase.from("profiles").select("id").eq("email", email).single();
  return data;
}
