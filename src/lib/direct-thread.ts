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
}): Promise<{ contextId: string; orgId: string } | null> {
  const contextId = getDirectContextId(opts.currentUserId, opts.targetUserId);

  // Check if thread already exists by looking for messages with this context_id
  const { data: existing } = await supabase
    .from("messages")
    .select("context_id, org_id")
    .eq("context_id", contextId)
    .limit(1)
    .single();

  if (existing) {
    return { contextId: existing.context_id!, orgId: existing.org_id };
  }

  // Get the current user's org (or target user's org) as the org_id anchor
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", opts.currentUserId)
    .limit(1)
    .single();

  // Fallback: try target user's org
  let orgId = membership?.org_id;
  if (!orgId) {
    const { data: targetMembership } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", opts.targetUserId)
      .limit(1)
      .single();
    orgId = targetMembership?.org_id;
  }

  if (!orgId) return null;

  // Create the thread by inserting a system message
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email")
    .eq("id", opts.currentUserId)
    .single();

  const { data: inserted } = await supabase
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
    } as any)
    .select("context_id, org_id")
    .single();

  if (!inserted) return null;
  return { contextId: inserted.context_id!, orgId: inserted.org_id };
}
