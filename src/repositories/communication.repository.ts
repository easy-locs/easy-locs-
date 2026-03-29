/**
 * communication.repository — Single source of truth for ALL communication DB operations.
 * Covers: messages, conversations, groups, calls, contacts, notifications, presence, activity logs.
 * No UI component should import supabase directly for these domains.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

// ═══ MESSAGES ═══

export async function updateMessageFields(messageId: string, fields: Record<string, any>) {
  const { error } = await db.from("chat_messages_v2").update(fields).eq("id", messageId);
  if (error) throw error;
}

export async function insertMessage(params: {
  conversationId: string;
  senderUserId: string;
  senderOrbitId?: string | null;
  receiverOrbitId?: string | null;
  type: string;
  body: string;
  metadata?: Record<string, any>;
  replyToMessageId?: string | null;
}) {
  const { data, error } = await db.from("chat_messages_v2").insert({
    conversation_id: params.conversationId,
    sender_user_id: params.senderUserId,
    sender_orbit_id: params.senderOrbitId || null,
    receiver_orbit_id: params.receiverOrbitId || null,
    type: params.type,
    body: params.body,
    metadata: params.metadata || null,
    reply_to_message_id: params.replyToMessageId || null,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function fetchGroupMessages(conversationId: string, limit = 200) {
  const { data, error } = await db
    .from("chat_messages_v2")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function markViewOnceOpened(messageId: string, userId: string) {
  await db.from("chat_messages_v2").update({
    view_once_opened_at: new Date().toISOString(),
    view_once_opened_by: userId,
  }).eq("id", messageId);
}

export async function starMessage(messageId: string, starred: boolean) {
  const { error } = await db.from("chat_messages_v2").update({ starred }).eq("id", messageId);
  if (error) throw error;
}

export async function deleteMessageForSender(messageId: string) {
  await db.from("chat_messages_v2").update({
    deleted_for_sender: true,
    deleted_at: new Date().toISOString(),
    deletion_reason: "self_hide",
  }).eq("id", messageId);
}

export async function deleteMessageForUser(messageId: string, userId: string) {
  const { data: existing } = await db.from("chat_messages_v2").select("metadata").eq("id", messageId).single();
  const meta = (existing?.metadata as Record<string, any>) || {};
  const currentIds: string[] = Array.isArray(meta.deleted_for_user_ids) ? meta.deleted_for_user_ids : [];
  if (!currentIds.includes(userId)) {
    await db.from("chat_messages_v2").update({
      metadata: { ...meta, deleted_for_user_ids: [...currentIds, userId] },
    }).eq("id", messageId);
  }
}

export async function deleteMessageForAll(messageId: string, userId?: string) {
  await db.from("chat_messages_v2").update({
    deleted_for_all: true,
    deleted_at: new Date().toISOString(),
    deleted_by: userId,
    deletion_reason: "user_action",
    content: "🚫 This message was deleted",
    attachment_url: null,
    audio_url: null,
    audio_duration_seconds: null,
  }).eq("id", messageId);
}

// ═══ CONVERSATIONS ═══

export async function updateConversationTimestamp(conversationId: string, preview?: string) {
  const update: Record<string, any> = {
    last_message_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (preview) update.last_message_preview = preview;
  await db.from("conversations_v2").update(update).eq("id", conversationId);
}

export async function createConversation(params: {
  type: string;
  title: string;
  participants: any[];
  createdByOrbitId?: string | null;
}) {
  const { data, error } = await db.from("conversations_v2").insert({
    type: params.type,
    title: params.title,
    participants: params.participants,
    created_by_orbit_id: params.createdByOrbitId || null,
    last_message_at: new Date().toISOString(),
  }).select("id, type, title, created_at, created_by_orbit_id").single();
  if (error) throw error;
  return data;
}

export async function getConversationParticipants(conversationId: string) {
  const { data } = await db.from("conversations_v2").select("participants").eq("id", conversationId).single();
  return data?.participants ?? [];
}

export async function updateConversationParticipants(conversationId: string, participants: any[]) {
  await db.from("conversations_v2").update({
    participants,
    updated_at: new Date().toISOString(),
  }).eq("id", conversationId);
}

// ═══ GROUPS ═══

export async function insertGroupMember(groupId: string, userId: string, role: string) {
  const { error } = await supabase.from("group_members").insert({
    group_id: groupId,
    user_id: userId,
    role,
  } as any);
  if (error) throw error;
}

export async function deleteGroupMember(memberId: string) {
  await supabase.from("group_members").delete().eq("id", memberId);
}

export async function deleteGroupMemberByUser(groupId: string, userId: string) {
  await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId);
}

export async function updateGroupMemberRole(memberId: string, role: string) {
  const { error } = await supabase.from("group_members").update({ role } as any).eq("id", memberId);
  if (error) throw error;
}

export async function fetchGroupMembers(groupId: string) {
  const { data } = await supabase.from("group_members").select("*").eq("group_id", groupId);
  return (data ?? []) as any[];
}

// ═══ CALLS ═══

export async function fetchCallLogs(userId: string, limit = 100) {
  // Resolve orbit_id for the user — call_logs stores orbit_ids, not auth UUIDs
  const { data: profile } = await db
    .from("orbit_profiles_v2")
    .select("orbit_id")
    .eq("id", userId)
    .maybeSingle();
  const orbitId = profile?.orbit_id || `orbit_${userId.slice(0, 12)}`;

  // Query by both auth UUID and orbit_id for backward compatibility
  const { data, error } = await supabase
    .from("call_logs")
    .select("*")
    .or(`caller_orbit_id.eq.${userId},receiver_orbit_id.eq.${userId},caller_orbit_id.eq.${orbitId},receiver_orbit_id.eq.${orbitId}`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as any[];
}

export async function deleteCallLog(callId: string) {
  const { error } = await supabase.from("call_logs").delete().eq("id", callId);
  if (error) throw error;
}

// ═══ PROFILES ═══

export async function resolveOrbitProfile(userId: string) {
  const { data } = await db
    .from("orbit_profiles_v2")
    .select("orbit_id, display_name, email, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

export async function resolveProfilesByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const { data } = await supabase.from("profiles").select("id, full_name, email, phone").in("id", ids);
  return data ?? [];
}

export async function resolveOrbitProfilesByUserIds(userIds: string[]) {
  if (userIds.length === 0) return [];
  const { data } = await db.from("orbit_profiles_v2").select("orbit_id, display_name, email, user_id").in("user_id", userIds);
  return data ?? [];
}

export async function resolveProfilesByEmail(emails: string[]) {
  if (emails.length === 0) return [];
  const { data } = await supabase.from("profiles").select("id, email").in("email", emails);
  return data ?? [];
}

export async function resolveProfileByEmail(email: string) {
  const { data } = await supabase.from("profiles").select("id").eq("email", email).single();
  return data;
}

export async function resolveProfilesByPhone() {
  const { data } = await supabase.from("profiles").select("id, phone, whatsapp_number").not("phone", "is", null);
  return data ?? [];
}

export async function resolveOrgMemberships(userIds: string[]) {
  if (userIds.length === 0) return [];
  const { data } = await supabase.from("org_members").select("user_id, org_id").in("user_id", userIds);
  return data ?? [];
}

// ═══ THREAD PREFERENCES ═══

export async function upsertConversationPreference(userId: string, contextId: string, muted: boolean, archived: boolean) {
  await supabase.from("conversation_preferences").upsert({
    user_id: userId,
    context_id: contextId,
    muted,
    archived,
    updated_at: new Date().toISOString(),
  } as any, { onConflict: "user_id,context_id" });
}

export async function blockUser(blockerId: string, blockedId: string) {
  await supabase.from("blocked_users").upsert({
    blocker_id: blockerId,
    blocked_id: blockedId,
  } as any, { onConflict: "blocker_id,blocked_id" });
}

export async function reportUser(reporterId: string, reportedUserId: string, reason: string, contextId: string) {
  await supabase.from("user_reports").insert({
    reporter_id: reporterId,
    reported_user_id: reportedUserId,
    reason,
    context_id: contextId,
  } as any);
}

// ═══ NOTIFICATIONS ═══

export async function insertAppNotification(params: {
  userId: string;
  scope?: string;
  category?: string;
  title: string;
  body?: string;
  severity?: string;
  route?: string;
  metadata?: Record<string, any>;
}) {
  await db.from("app_notifications").insert({
    user_id: params.userId,
    scope: params.scope || "global",
    category: params.category || "info",
    title: params.title,
    body: params.body || null,
    severity: params.severity || "info",
    route: params.route || null,
    metadata: params.metadata || {},
  });
}

export async function fetchNotificationPreferences(userId: string) {
  const { data } = await supabase.from("notification_preferences").select("*").eq("user_id", userId).maybeSingle();
  return data;
}

export async function upsertNotificationPreferences(userId: string, prefs: Record<string, any>) {
  const { error } = await supabase.from("notification_preferences").upsert(
    { user_id: userId, ...prefs, updated_at: new Date().toISOString() } as any,
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

// ═══ PRESENCE ═══

export async function fetchPresenceSettings(userId: string) {
  const { data } = await supabase.from("user_presence").select("visible_on_nearby, location_sharing, who_can_see").eq("user_id", userId).single();
  return data;
}

export async function updatePresence(userId: string, fields: Record<string, any>) {
  await supabase.from("user_presence").update(fields as any).eq("user_id", userId);
}

export async function fetchNearbyUsers(excludeUserId: string) {
  const { data } = await supabase
    .from("user_presence")
    .select("user_id, display_name, avatar_url, status, professional_category, verified, lat, lng, last_seen_at")
    .eq("visible_on_nearby", true)
    .eq("location_sharing", true)
    .not("lat", "is", null)
    .not("lng", "is", null)
    .neq("user_id", excludeUserId);
  return data ?? [];
}

// ═══ NEARBY ITEMS ═══

export async function searchNearbyItems(lat: number, lng: number, radiusKm: number, itemType?: string | null) {
  const { data, error } = await supabase.rpc("search_nearby_items", {
    _lat: lat, _lng: lng, _radius_km: radiusKm,
    _item_type: itemType || null,
  });
  if (error) throw error;
  return data ?? [];
}

// ═══ STORAGE ═══

export async function uploadToStorage(bucket: string, path: string, file: File | Blob) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) throw error;
  const { data: signedData } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
  return signedData?.signedUrl || null;
}

// ═══ CONTEXT PANEL DATA ═══

export async function fetchPropertyContext(orgId: string, tenantId: string) {
  const [leaseRes, rentRes, interventionRes, docRes] = await Promise.all([
    supabase.from("leases").select("id, lease_type, start_date, end_date, rent_amount, charges_amount, status, country")
      .eq("org_id", orgId).eq("tenant_id", tenantId).order("start_date", { ascending: false }).limit(3),
    supabase.from("rent_calls").select("id, month, total_amount, paid, paid_amount, paid_date")
      .eq("org_id", orgId).eq("tenant_id", tenantId).order("month", { ascending: false }).limit(6),
    supabase.from("interventions").select("id, title, status, priority, category, created_at")
      .eq("org_id", orgId).eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(5),
    supabase.from("documents").select("id, title, doc_type, status, created_at")
      .eq("org_id", orgId).eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(5),
  ]);
  return {
    leases: leaseRes.data || [],
    rentCalls: rentRes.data || [],
    interventions: interventionRes.data || [],
    documents: docRes.data || [],
  };
}

export async function fetchBookingContext(bookingId: string, bookingType: string) {
  let booking: any = null;
  let service: any = null;

  if (bookingType === "marketplace") {
    const { data } = await supabase.from("marketplace_bookings").select("*").eq("id", bookingId).single();
    booking = data;
    if (data?.service_id) {
      const { data: svc } = await supabase.from("marketplace_services").select("id, title, description, price, currency, category, city, country, photo_urls, booking_slug").eq("id", data.service_id).single();
      service = svc;
    }
  } else if (bookingType === "concierge") {
    const { data } = await supabase.from("concierge_orders").select("*").eq("id", bookingId).single();
    booking = data;
    if (data?.service_id) {
      const { data: svc } = await supabase.from("concierge_services").select("id, title, description, price, currency, category, city, country, photo_url").eq("id", data.service_id).single();
      service = svc;
    }
  } else if (bookingType === "seasonal") {
    const { data } = await supabase.from("booking_requests").select("*").eq("id", bookingId).single();
    booking = data;
  }

  return { booking, service };
}

// ═══ THREAD STATS ═══

export async function fetchThreadStats(orgId: string) {
  const [docRes, overdueRes, maintRes] = await Promise.all([
    supabase.from("document_requests").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "pending"),
    supabase.from("rent_calls").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("paid", false),
    supabase.from("interventions").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "pending"),
  ]);
  return {
    pending_docs: docRes.count || 0,
    overdue: overdueRes.count || 0,
    maintenance: maintRes.count || 0,
  };
}

// ═══ ACTIVITY LOG ═══

export async function fetchEntityMessages(entityType: string, entityId: string, maxItems: number) {
  let query = db.from("chat_messages_v2").select("id, body, created_at, sender_user_id, type, metadata");
  if (entityType === "property") query = query.eq("property_id", entityId);
  else if (entityType === "tenant") query = query.eq("tenant_id", entityId);
  else if (entityType === "booking") query = query.eq("booking_id", entityId);
  const { data } = await query.order("created_at", { ascending: false }).limit(maxItems);
  return data ?? [];
}

export async function fetchEntityPayments(entityType: string, entityId: string, orgId: string, maxItems: number) {
  let query = supabase.from("rent_calls").select("id, month, total_amount, paid, paid_date").eq("org_id", orgId);
  if (entityType === "property") query = query.eq("property_id", entityId);
  if (entityType === "tenant") query = query.eq("tenant_id", entityId);
  const { data } = await query.order("month", { ascending: false }).limit(maxItems);
  return data ?? [];
}

export async function fetchEntityDocuments(orgId: string, leaseIds?: string[], maxItems = 50) {
  let query = supabase.from("documents").select("id, title, doc_type, created_at, status").eq("org_id", orgId);
  if (leaseIds?.length) query = query.in("lease_id", leaseIds);
  const { data } = await query.order("created_at", { ascending: false }).limit(maxItems);
  return data ?? [];
}

export async function fetchEntityInterventions(entityType: string, entityId: string, orgId: string, maxItems: number) {
  let query = supabase.from("interventions").select("id, title, status, priority, created_at, category").eq("org_id", orgId);
  if (entityType === "property") query = query.eq("property_id", entityId);
  if (entityType === "tenant") query = query.eq("tenant_id", entityId);
  const { data } = await query.order("created_at", { ascending: false }).limit(maxItems);
  return data ?? [];
}

export async function fetchEntityBookings(propertyId: string, orgId: string, maxItems: number) {
  const { data } = await supabase
    .from("booking_requests")
    .select("id, guest_name, check_in, check_out, status, created_at")
    .eq("property_id", propertyId)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(maxItems);
  return data ?? [];
}

export async function fetchEntityLeases(entityType: string, entityId: string, orgId: string) {
  let query = supabase.from("leases").select("id, lease_type, start_date, end_date, rent_amount, status, created_at").eq("org_id", orgId);
  if (entityType === "property") query = query.eq("property_id", entityId);
  if (entityType === "tenant") query = query.eq("tenant_id", entityId);
  const { data } = await query.order("created_at", { ascending: false }).limit(10);
  return data ?? [];
}

export async function fetchLeaseIdsByProperty(propertyId: string, orgId: string) {
  const { data } = await supabase.from("leases").select("id").eq("property_id", propertyId).eq("org_id", orgId);
  return data?.map(l => l.id) ?? [];
}

// ═══ UNREAD COUNT ═══

export async function fetchUnreadCount(userId: string) {
  const { count } = await db
    .from("chat_messages_v2")
    .select("id", { count: "exact", head: true })
    .is("read_at", null)
    .neq("sender_user_id", userId);
  return count ?? 0;
}

// ═══ INVITE ═══

export async function sendInviteEmail(recipientEmail: string, subject: string, message: string, ctaUrl: string, ctaLabel: string) {
  await supabase.functions.invoke("send-notification-email", {
    body: {
      event_type: "marketplace_notification",
      recipient_email: recipientEmail,
      data: { subject, message, cta_url: ctaUrl, cta_label: ctaLabel },
      locale: "fr",
    },
  });
}

// ── Chat message delete/edit ──
export async function deleteChatMessageForEveryone(msgId: string, userId: string) {
  const { error } = await db.from("chat_messages_v2").update({
    deleted_at: new Date().toISOString(),
    body: "🚫 This message was deleted",
    metadata: { deleted_by: userId, deletion_reason: "user_action" },
  }).eq("id", msgId);
  if (error) throw error;
}

export async function deleteChatMessageModeration(msgId: string, userId: string) {
  const { error } = await db.from("chat_messages_v2").update({
    deleted_at: new Date().toISOString(),
    body: "🚫 This message was deleted",
    metadata: { deleted_by: userId, deletion_reason: "moderation" },
  }).eq("id", msgId);
  if (error) throw error;
}

export async function hideChatMessageForSelf(msgId: string, userId: string) {
  const { error } = await db.from("chat_messages_v2").update({
    metadata: { hidden_for: [userId] },
  }).eq("id", msgId);
  if (error) throw error;
}

export async function editChatMessage(msgId: string, newBody: string) {
  const { error } = await db.from("chat_messages_v2").update({
    body: newBody, edited_at: new Date().toISOString(),
  }).eq("id", msgId);
  if (error) throw error;
}

export async function setDisappearTimer(msgId: string, seconds: number) {
  const disappearAt = seconds > 0 ? new Date(Date.now() + seconds * 1000).toISOString() : null;
  const { error } = await db.from("chat_messages_v2").update({
    metadata: { disappear_after_seconds: seconds, disappear_at: disappearAt },
  }).eq("id", msgId);
  if (error) throw error;
}

// ── Voice message insert ──
export async function insertVoiceMessage(params: {
  conversationId: string; senderUserId: string; senderOrbitId: string;
  body: string; audioUrl: string; duration: number;
}) {
  const { data, error } = await db.from("chat_messages_v2").insert({
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

// ── Chat media/attachment upload ──
export async function uploadChatMedia(path: string, file: File) {
  const { error } = await supabase.storage.from("chat-media").upload(path, file);
  if (error) throw error;
  const { data: signed } = await supabase.storage.from("chat-media").createSignedUrl(path, 60 * 60 * 24 * 365);
  return signed?.signedUrl || path;
}

export async function uploadChatAttachment(path: string, blob: Blob) {
  const { error } = await supabase.storage.from("chat-attachments").upload(path, blob);
  if (error) throw error;
  const { data: signed } = await supabase.storage.from("chat-attachments").createSignedUrl(path, 60 * 60 * 24 * 365);
  return signed?.signedUrl || path;
}

// ── Auth user for comm hooks ──
export async function getCommAuthUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

// Realtime channel helpers moved to src/lib/realtime.ts

// ── Chat payment message bridge ──
export async function insertChatMessageV2(payload: Record<string, any>) {
  const { data, error } = await db.from("chat_messages_v2").insert(payload).select("*").single();
  if (error) throw error;
  return data;
}

export async function insertWalletTransaction(payload: Record<string, any>) {
  await db.from("unified_wallet_transactions").insert(payload);
}

// ── Group extras ──
export async function fetchGroupMembersById(groupId: string) {
  const { data } = await db.from("group_members").select("*").eq("group_id", groupId);
  return data || [];
}

export async function countGroupMembers(groupId: string) {
  const { count } = await supabase.from("group_members").select("*", { count: "exact", head: true }).eq("group_id", groupId);
  return count || 0;
}

export async function fetchLastGroupMessage(conversationId: string) {
  const { data } = await db.from("chat_messages_v2").select("body, created_at").eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(1);
  return data?.[0] || null;
}

export async function fetchGroupsAndChannels() {
  const { data, error } = await db.from("conversations_v2").select("*").in("type", ["group", "channel", "community"]).order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createGroupConversation(payload: Record<string, any>) {
  const { data, error } = await db.from("conversations_v2").insert(payload).select("id, type, title, created_at, created_by_orbit_id").single();
  if (error) throw error;
  return data;
}

export async function fetchOrbitProfile(userId: string) {
  const { data } = await db.from("orbit_profiles_v2").select("orbit_id, display_name, email, avatar_url").eq("id", userId).maybeSingle();
  return data;
}

// ── Encryption key bundles ──
export async function upsertKeyBundle(userId: string, publicKey: string, deviceId: string) {
  await db.from("user_key_bundles").upsert({
    user_id: userId,
    identity_public_key: publicKey,
    device_id: deviceId,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
}

export async function fetchPeerKeyBundle(peerId: string) {
  const { data } = await db.from("user_key_bundles").select("identity_public_key").eq("user_id", peerId).maybeSingle();
  return (data as any)?.identity_public_key as string | undefined;
}

// ── Orbit permissions sync ──
export async function updateOrbitPermissions(userId: string, permissions: Record<string, boolean>) {
  await db.from("orbit_profiles_v2").update({ permissions } as any).eq("id", userId);
}

// ── Upload booking document ──
export async function uploadBookingDocument(path: string, file: File) {
  const { error } = await supabase.storage.from("booking-documents").upload(path, file, { upsert: true });
  if (error) throw error;
}

// ── Chat payment message insert (alias) ──
export const insertChatPaymentMessage = insertChatMessageV2;

// ── Sign URLs (separate from upload) ──
export async function signChatMediaUrl(path: string, expiresIn = 60 * 60 * 24 * 365) {
  const { data } = await supabase.storage.from("chat-media").createSignedUrl(path, expiresIn);
  return data?.signedUrl || path;
}

export async function signChatAttachmentUrl(path: string, expiresIn = 60 * 60 * 24 * 365) {
  const { data } = await supabase.storage.from("chat-attachments").createSignedUrl(path, expiresIn);
  return data?.signedUrl || path;
}

// ── Notification preferences ──
export async function fetchNotificationPrefs(userId: string) {
  const { data } = await db.from("notification_preferences").select("*").eq("user_id", userId).maybeSingle();
  return data;
}

export async function upsertNotificationPrefs(userId: string, prefs: Record<string, any>) {
  const { error } = await db.from("notification_preferences").upsert(
    { user_id: userId, ...prefs, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

// ── Conversation participants fetch ──
export async function fetchConversationParticipants(convId: string) {
  const { data } = await db.from("conversations_v2").select("participants").eq("id", convId).single();
  return data;
}

// ── Group member count ──
export async function fetchGroupMemberCount(groupId: string) {
  const { count } = await db.from("group_members").select("*", { count: "exact", head: true }).eq("group_id", groupId);
  return count || 0;
}

// ═══ CALL LIFECYCLE (canonical) ═══

export async function markCallAsMissedV2(sessionId: string, reason: string) {
  await db.rpc("mark_call_as_missed_v2", { p_session_id: sessionId, p_reason: reason });
}

export async function markCallActive(callId: string) {
  const now = new Date().toISOString();
  return db.from("call_logs")
    .update({ status: "active", started_at: now, answered_at: now })
    .eq("id", callId)
    .select("id,status,started_at")
    .maybeSingle();
}

export async function markCallDeclined(callId: string) {
  return db.from("call_logs")
    .update({ status: "declined", ended_at: new Date().toISOString() })
    .eq("id", callId)
    .neq("status", "declined")
    .select("id,status,ended_at")
    .maybeSingle();
}

export async function markCallEnded(callId: string, durationSec: number) {
  return db.from("call_logs")
    .update({ status: "ended", ended_at: new Date().toISOString(), duration_sec: durationSec })
    .eq("id", callId)
    .neq("status", "ended")
    .select("id,status,ended_at,duration_sec")
    .maybeSingle();
}

export async function markCallMissedByCallId(callId: string) {
  return db.from("call_logs")
    .update({ status: "missed", ended_at: new Date().toISOString() })
    .eq("id", callId);
}

export async function acceptCallSession(sessionId: string) {
  const now = new Date().toISOString();
  const { error } = await db.from("call_sessions")
    .update({ status: "active", answered_at: now, updated_at: now })
    .eq("id", sessionId);
  if (error) throw error;
  await db.from("call_logs")
    .update({ status: "answered", answered_at: now })
    .eq("session_id", sessionId);
}

export async function declineCallSession(sessionId: string) {
  const now = new Date().toISOString();
  await db.from("call_sessions")
    .update({ status: "declined", ended_at: now, updated_at: now, metadata: { ended_reason: "declined" } })
    .eq("id", sessionId);
  await db.from("call_logs")
    .update({ status: "declined", ended_at: now, ended_reason: "declined" })
    .eq("session_id", sessionId);
}

export async function hangupCallSession(sessionId: string, reason = "hangup") {
  const now = new Date().toISOString();
  await db.from("call_sessions")
    .update({ status: "ended", ended_at: now, updated_at: now, metadata: { ended_reason: reason } })
    .eq("id", sessionId);
  await db.from("call_logs")
    .update({ status: "ended", ended_at: now, ended_reason: reason })
    .eq("session_id", sessionId);
}

export async function markCallReconnecting(sessionId: string, reconnectCount: number) {
  await db.from("call_sessions")
    .update({ reconnect_count: reconnectCount, quality_state: "reconnecting", updated_at: new Date().toISOString() })
    .eq("id", sessionId);
}

export async function createOutgoingCallSession(params: {
  conversationId?: string | null;
  callerOrbitId: string;
  receiverOrbitId?: string | null;
  mode: "audio" | "video";
}) {
  const now = new Date().toISOString();
  const { data: session, error: sessionErr } = await db.from("call_sessions").insert({
    conversation_id: params.conversationId || null,
    caller_orbit_id: params.callerOrbitId,
    receiver_orbit_id: params.receiverOrbitId,
    call_type: params.mode,
    status: "ringing",
    started_at: now, created_at: now, updated_at: now,
    metadata: {},
  }).select("*").single();
  if (sessionErr) throw sessionErr;

  await db.from("call_logs").insert({
    conversation_id: params.conversationId || null,
    session_id: session.id,
    caller_orbit_id: params.callerOrbitId,
    receiver_orbit_id: params.receiverOrbitId,
    call_type: params.mode,
    direction: "outgoing",
    status: "ringing",
    started_at: now, created_at: now,
    missed: false, metadata: {},
  });

  return session;
}

export async function broadcastCallSignal(callId: string, signalType: string, fromUserId: string) {
  const channel = supabase.channel(`call:${callId}`, { config: { broadcast: { self: false } } });
  await channel.subscribe();
  channel.send({ type: "broadcast", event: "signal", payload: { type: signalType, data: "{}", from: fromUserId } });
  setTimeout(() => supabase.removeChannel(channel), 1000);
}

// ── Concierge payment ──
export async function invokeCreateConciergePayment(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("create-concierge-payment", { body });
  if (error) throw error;
  return data;
}
