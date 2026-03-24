/**
 * Direct user-to-user thread utilities.
 * CANONICAL V2 PATH: Creates conversations_v2 entries for direct messaging.
 * Legacy conversation_threads are only used as fallback for business contexts.
 */
import { supabase } from "@/integrations/supabase/client";

/** Generate a deterministic direct-thread context_id from two user IDs */
export function getDirectContextId(userA: string, userB: string): string {
  const sorted = [userA, userB].sort();
  return `direct:${sorted[0]}:${sorted[1]}`;
}

/** Self-conversation guard */
function assertNotSelf(currentUserId: string, targetUserId: string): void {
  if (currentUserId === targetUserId) {
    throw new Error("[direct-thread] BLOCKED: Cannot create self-conversation");
  }
}

/**
 * Find or create a V2 direct conversation between two users.
 * Returns the V2 conversation ID and metadata.
 */
export async function getOrCreateDirectThread(opts: {
  currentUserId: string;
  targetUserId: string;
  targetName: string;
}): Promise<{ contextId: string; orgId: string; threadId?: string; v2ConversationId?: string; isV2?: boolean } | null> {
  assertNotSelf(opts.currentUserId, opts.targetUserId);
  
  const contextId = getDirectContextId(opts.currentUserId, opts.targetUserId);

  // ── 1. Check V2 conversations first (canonical) ──
  try {
    const { data: v2Existing } = await (supabase as any)
      .from("conversations_v2")
      .select("id, participants")
      .eq("type", "direct")
      .limit(200);

    if (v2Existing?.length) {
      for (const conv of v2Existing) {
        const participants = conv.participants as any[];
        if (!Array.isArray(participants)) continue;
        const userIds = participants
          .map((p: any) => p?.userId || p?.user_id || p?.id || (typeof p === "string" ? p : null))
          .filter(Boolean);
        if (
          userIds.includes(opts.currentUserId) &&
          userIds.includes(opts.targetUserId) &&
          userIds.length === 2
        ) {
          return {
            contextId,
            orgId: "",
            threadId: conv.id,
            v2ConversationId: conv.id,
            isV2: true,
          };
        }
      }
    }
  } catch (e) {
    console.warn("[direct-thread] V2 lookup failed:", e);
  }

  // ── 2. Check legacy conversation_threads (backward compat) ──
  const { data: existingThread } = await supabase
    .from("conversation_threads")
    .select("id, org_id, context_id")
    .eq("context_id", contextId)
    .limit(1)
    .maybeSingle();

  if (existingThread) {
    return { contextId: existingThread.context_id!, orgId: existingThread.org_id, threadId: existingThread.id };
  }

  // ── 3. Resolve org_id ──
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", opts.currentUserId)
    .limit(1)
    .maybeSingle();

  let orgId = membership?.org_id;
  if (!orgId) {
    const { data: targetMembership } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", opts.targetUserId)
      .limit(1)
      .maybeSingle();
    orgId = targetMembership?.org_id;
  }

  if (!orgId) return null;

  // ── 4. Create V2 conversation (canonical path) ──
  try {
    // Get orbit profiles for both users
    const { data: orbitProfiles } = await (supabase as any)
      .from("orbit_profiles_v2")
      .select("id, orbit_id, display_name, email, avatar_url")
      .in("id", [opts.currentUserId, opts.targetUserId]);

    const profileMap = new Map((orbitProfiles || []).map((p: any) => [p.id, p]));
    const currentProfile = profileMap.get(opts.currentUserId);
    const targetProfile = profileMap.get(opts.targetUserId);

    const participants = [
      {
        userId: opts.currentUserId,
        orbitId: currentProfile?.orbit_id || null,
        displayName: currentProfile?.display_name || "You",
        email: currentProfile?.email || null,
        avatarUrl: currentProfile?.avatar_url || null,
      },
      {
        userId: opts.targetUserId,
        orbitId: targetProfile?.orbit_id || null,
        displayName: targetProfile?.display_name || opts.targetName,
        email: targetProfile?.email || null,
        avatarUrl: targetProfile?.avatar_url || null,
      },
    ];

    const { data: v2Conv, error: v2Err } = await (supabase as any)
      .from("conversations_v2")
      .insert({
        type: "direct",
        participants,
        title: null,
        created_by: opts.currentUserId,
        last_message_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();

    if (v2Conv && !v2Err) {
      return {
        contextId,
        orgId,
        threadId: v2Conv.id,
        v2ConversationId: v2Conv.id,
        isV2: true,
      };
    }
    console.warn("[direct-thread] V2 create failed, falling back to legacy:", v2Err);
  } catch (e) {
    console.warn("[direct-thread] V2 creation error:", e);
  }

  // ── 5. Legacy fallback — create conversation_threads ──
  const threadId = await ensureConversationThread(orgId, contextId, opts);

  await supabase
    .from("messages")
    .insert({
      org_id: orgId,
      sender_id: opts.currentUserId,
      content: "💬 Conversation started",
      context_id: contextId,
      context_type: "direct",
      message_type: "system",
      contact_name: opts.targetName,
      conversation_status: "active",
    } as any);

  return { contextId, orgId, threadId: threadId || undefined };
}

/** Ensure a conversation_threads row exists for a direct thread. Returns thread ID. */
async function ensureConversationThread(
  orgId: string,
  contextId: string,
  opts: { currentUserId: string; targetUserId: string; targetName: string }
): Promise<string | null> {
  try {
    const { data } = await supabase.from("conversation_threads").insert({
      org_id: orgId,
      context_type: "direct",
      context_id: contextId,
      initiator_id: opts.currentUserId,
      participant_ids: [opts.currentUserId, opts.targetUserId],
      provider_name: opts.targetName,
      status: "active",
      last_message_at: new Date().toISOString(),
    }).select("id").maybeSingle();
    return data?.id || null;
  } catch (e) {
    console.warn("[direct-thread] conversation_threads insert:", e);
    const { data: existing } = await supabase
      .from("conversation_threads")
      .select("id")
      .eq("context_id", contextId)
      .limit(1)
      .maybeSingle();
    return existing?.id || null;
  }
}
