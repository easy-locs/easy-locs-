/**
 * chat.repository — All chat message DB operations.
 * Extracted from ClientMessages and other comm-hub components.
 */
import { supabase } from "@/integrations/supabase/client";

export async function sendChatMessage(params: {
  conversationId: string;
  senderUserId: string;
  content: string;
  messageType?: string;
  metadata?: any;
}) {
  const { data, error } = await (supabase as any).from("chat_messages_v2").insert({
    conversation_id: params.conversationId,
    sender_user_id: params.senderUserId,
    content: params.content,
    message_type: params.messageType || "text",
    metadata: params.metadata || null,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function sendMediaMessage(params: {
  conversationId: string;
  senderUserId: string;
  content: string;
  mediaUrl: string;
  messageType: string;
  metadata?: any;
}) {
  const { data, error } = await (supabase as any).from("chat_messages_v2").insert({
    conversation_id: params.conversationId,
    sender_user_id: params.senderUserId,
    content: params.content,
    message_type: params.messageType,
    metadata: { ...(params.metadata || {}), media_url: params.mediaUrl },
  }).select().single();
  if (error) throw error;
  return data;
}

export async function softDeleteMessage(messageId: string, userId: string, existingMetadata: any) {
  await (supabase as any).from("chat_messages_v2").update({
    metadata: {
      ...(existingMetadata || {}),
      deleted_by: [...((existingMetadata as any)?.deleted_by || []), userId],
    },
  }).eq("id", messageId);
}

// ── Insert raw chat message (payment cards, offline) ──
export async function insertRawChatMessage(payload: Record<string, any>) {
  const { data, error } = await (supabase as any).from("chat_messages_v2").insert(payload).select("*").single();
  if (error) throw error;
  return data;
}

export async function insertOfflineChatMessage(payload: Record<string, any>) {
  const { error } = await (supabase as any).from("chat_messages_v2").insert(payload);
  if (error) throw error;
}

// ── Translation ──
export async function updateChatMessageTranslation(msgId: string, translated: string, locale: string) {
  await supabase.from("chat_messages_v2").update({
    translated_content: translated, translated_locale: locale,
  } as any).eq("id", msgId);
}

export async function invokeTranslateMessage(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("translate-message", { body });
  if (error) throw error;
  return data;
}

// ── Chat media upload ──
export async function uploadChatMedia(path: string, file: File) {
  const { error } = await supabase.storage.from("chat-media").upload(path, file);
  if (error) throw error;
  const { data: signed } = await supabase.storage.from("chat-media").createSignedUrl(path, 60 * 60 * 24 * 365);
  return signed?.signedUrl || path;
}

// ── Voice / chat-attachments ──
export async function uploadChatAttachment(path: string, blob: Blob) {
  const { error } = await supabase.storage.from("chat-attachments").upload(path, blob);
  if (error) throw error;
  const { data: signed } = await supabase.storage.from("chat-attachments").createSignedUrl(path, 60 * 60 * 24 * 365);
  return signed?.signedUrl || path;
}

// ── Group members ──
export async function updateGroupMemberRole(memberId: string, role: string) {
  const { error } = await supabase.from("group_members").update({ role } as any).eq("id", memberId);
  if (error) throw error;
}

export async function fetchGroupMembers(groupId: string) {
  const { data } = await supabase.from("group_members").select("*").eq("group_id", groupId);
  return data || [];
}

export async function countGroupMembers(groupId: string) {
  const { count } = await supabase.from("group_members").select("*", { count: "exact", head: true }).eq("group_id", groupId);
  return count || 0;
}

export async function insertGroupMember(groupId: string, userId: string, role: string) {
  await supabase.from("group_members").insert({ group_id: groupId, user_id: userId, role } as any);
}

// ── Notification preferences ──
export async function upsertNotificationPreferences(userId: string, prefs: Record<string, any>) {
  const { error } = await supabase.from("notification_preferences").upsert(
    { user_id: userId, ...prefs, updated_at: new Date().toISOString() } as any,
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

// ── Auth user (for offline/comm hooks) ──
export async function getAuthUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

// ── Last message for group ──
export async function fetchLastGroupMessage(conversationId: string) {
  const { data } = await (supabase as any).from("chat_messages_v2")
    .select("body, created_at").eq("conversation_id", conversationId)
    .order("created_at", { ascending: false }).limit(1);
  return data?.[0] || null;
}

// ── Voice message insert ──
export async function insertVoiceMessage(params: {
  conversationId: string; senderUserId: string; senderOrbitId: string;
  body: string; audioUrl: string; duration: number;
}) {
  const { data, error } = await (supabase as any).from("chat_messages_v2").insert({
    conversation_id: params.conversationId,
    sender_user_id: params.senderUserId,
    sender_orbit_id: params.senderOrbitId,
    type: "audio",
    body: params.body,
    metadata: { audio_url: params.audioUrl, audio_duration_seconds: params.duration },
  }).select("*").single();
  if (error) throw error;
  return data;
}
