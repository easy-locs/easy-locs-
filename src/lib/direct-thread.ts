/**
 * Direct user-to-user thread utilities.
 * Creates a deterministic context_id from two user UUIDs for 1:1 conversations.
 */
import { supabase } from "@/integrations/supabase/client";

/** Generate a deterministic direct-thread context_id from two user IDs */
export function getDirectContextId(userA: string, userB: string): string {
  // Sort to ensure the same ID regardless of who initiates
  const sorted = [userA, userB].sort();
  return `direct:${sorted[0]}:${sorted[1]}`;
}

/** Find or create a conversation thread for direct messaging between two users */
export async function getOrCreateDirectThread(opts: {
  currentUserId: string;
  targetUserId: string;
  targetName: string;
}): Promise<{ contextId: string; orgId: string; threadId?: string } | null> {
  const contextId = getDirectContextId(opts.currentUserId, opts.targetUserId);

  // Check if a conversation_threads row already exists for this context
  const { data: existingThread } = await supabase
    .from("conversation_threads")
    .select("id, org_id, context_id")
    .eq("context_id", contextId)
    .limit(1)
    .maybeSingle();

  if (existingThread) {
    return { contextId: existingThread.context_id!, orgId: existingThread.org_id, threadId: existingThread.id };
  }

  // Also check by messages (legacy fallback)
  const { data: existingMsg } = await supabase
    .from("messages")
    .select("context_id, org_id")
    .eq("context_id", contextId)
    .limit(1)
    .maybeSingle();

  // Get the current user's org (or target user's org) as the org_id anchor
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", opts.currentUserId)
    .limit(1)
    .maybeSingle();

  // Fallback: try target user's org
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

  // If we found existing messages but no thread row, create the thread row
  if (existingMsg) {
    const threadId = await ensureConversationThread(orgId, contextId, opts);
    return { contextId, orgId, threadId: threadId || undefined };
  }

  // Create conversation_threads row first
  const threadId = await ensureConversationThread(orgId, contextId, opts);

  // Then create a system message to seed the conversation
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email")
    .eq("id", opts.currentUserId)
    .maybeSingle();

  await supabase
    .from("messages")
    .insert({
      org_id: orgId,
      sender_id: opts.currentUserId,
      content: "💬 Conversation started",
      context_id: contextId,
      context_type: "direct",
      message_type: "system",
      contact_email: profile?.email || "",
      contact_name: profile?.name || "User",
      conversation_status: "active",
    } as any);

  return { contextId, orgId, threadId: threadId || undefined };
}

/** Ensure a conversation_threads row exists for a direct thread */
async function ensureConversationThread(
  orgId: string,
  contextId: string,
  opts: { currentUserId: string; targetUserId: string; targetName: string }
) {
  try {
    await supabase.from("conversation_threads").insert({
      org_id: orgId,
      context_type: "direct",
      context_id: contextId,
      initiator_id: opts.currentUserId,
      participant_ids: [opts.currentUserId, opts.targetUserId],
      provider_name: opts.targetName,
      status: "active",
      last_message_at: new Date().toISOString(),
    }).select("id").maybeSingle();
  } catch (e) {
    // May already exist (race condition) — that's fine
    console.warn("[direct-thread] conversation_threads insert:", e);
  }
}
