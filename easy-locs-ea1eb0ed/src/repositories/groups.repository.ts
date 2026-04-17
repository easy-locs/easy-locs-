/**
 * Groups Repository — All group/channel/community DB operations.
 */
import { db } from "@/services/db";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
export async function fetchUserGroupIds(userId: string) {
  const { data, error } = await cFrom("group_members").select("group_id").eq("user_id", userId);
  if (error) throw error;
  return (data || []).map((r: any) => r.group_id).filter(Boolean);
}

export async function fetchConversationsByTypes(types: string[]) {
  const { data, error } = await cFrom("conversations_v2").select("*").in("type", types).order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchGroupMemberCount(groupId: string) {
  const { count } = await cFrom("group_members").select("*", { count: "exact", head: true }).eq("group_id", groupId);
  return count || 0;
}

export async function fetchLastMessage(conversationId: string) {
  const { data } = await cFrom("chat_messages_v2").select("body, created_at").eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(1);
  return data?.[0] || null;
}

export async function fetchGroupMembers(groupId: string) {
  const { data } = await cFrom("group_members").select("*").eq("group_id", groupId);
  return data || [];
}

export async function fetchGroupMessages(conversationId: string, limit = 200) {
  const { data } = await cFrom("chat_messages_v2").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(limit);
  return data || [];
}

export async function fetchOrbitProfile(userId: string) {
  const { data } = await cFrom("orbit_profiles_v2").select("orbit_id, display_name, email, avatar_url").eq("id", userId).maybeSingle();
  return data;
}

/** @deprecated Delegates to canonical createConversation */
export async function createConversation(payload: Record<string, any>) {
  const { createConversation: canonical } = await import("@/repositories/communication.repository");
  return canonical({
    type: payload.type ?? "group",
    title: payload.title ?? "",
    participants: payload.participants ?? [],
    createdByOrbitId: payload.created_by_orbit_id ?? null,
  });
}

export async function insertGroupMember(groupId: string, userId: string, role: string) {
  const { error } = await cFrom("group_members").insert({ group_id: groupId, user_id: userId, role } as any);
  if (error) throw error;
}

export async function insertChatMessage(payload: Record<string, any>) {
  const { insertMessage } = await import("@/repositories/communication.repository");
  return insertMessage({
    conversationId: payload.conversation_id,
    senderUserId: payload.sender_user_id,
    senderOrbitId: payload.sender_orbit_id || null,
    type: payload.type || "text",
    body: payload.body || "",
    metadata: { schemaVersion: 1, ...payload.metadata },
  });
}

export async function updateConversation(id: string, payload: Record<string, any>) {
  const { error } = await cFrom("conversations_v2").update(payload).eq("id", id);
  if (error) throw error;
}

export async function fetchConversationParticipants(id: string) {
  const { data } = await cFrom("conversations_v2").select("participants").eq("id", id).single();
  return data;
}

export async function updateGroupMemberRole(memberId: string, role: string) {
  const { error } = await cFrom("group_members").update({ role } as any).eq("id", memberId);
  if (error) throw error;
}

export async function deleteGroupMember(memberId: string) {
  await cFrom("group_members").delete().eq("id", memberId);
}

export async function deleteGroupMemberByUser(groupId: string, userId: string) {
  await cFrom("group_members").delete().eq("group_id", groupId).eq("user_id", userId);
}

export async function deleteConversation(id: string) {
  await cFrom("conversations_v2").delete().eq("id", id);
}

export async function deleteGroupMembers(groupId: string) {
  await cFrom("group_members").delete().eq("group_id", groupId);
}

export async function fetchProfileByEmail(email: string) {
  const { data } = await cFrom("profiles").select("id").eq("email", email).single();
  return data;
}
