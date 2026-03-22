/**
 * Ghost Message Engine — E2EE messaging, thread management, message TTL, burn-after-read.
 */
import { supabase } from "@/integrations/supabase/client";
import { getGhostPolicy, GhostTier } from "./ghost-policy";
import { maybeRotateOnNewThread } from "./ghost-alias-engine";

// ─── Thread Management ──────────────────────────────────

export async function createGhostThread(
  creatorGhostProfileId: string,
  creatorAlias: string,
  tier: GhostTier,
  opts?: { isEphemeral?: boolean; messageTtlSeconds?: number; burnAfterRead?: boolean }
) {
  const policy = getGhostPolicy(tier);

  const { data: thread, error } = await supabase
    .from("ghost_threads")
    .insert({
      tier,
      is_ephemeral: opts?.isEphemeral ?? policy.noHistoryMode,
      message_ttl_seconds: opts?.messageTtlSeconds ?? policy.messageTtlSeconds,
      burn_after_read: opts?.burnAfterRead ?? policy.burnAfterRead,
    })
    .select("*")
    .single();

  if (error) throw error;

  // Add creator as member
  await supabase.from("ghost_thread_members").insert({
    thread_id: thread.id,
    ghost_profile_id: creatorGhostProfileId,
    alias_at_join: creatorAlias,
  });

  // V3: rotate alias on new thread
  await maybeRotateOnNewThread(creatorGhostProfileId, tier);

  console.log("[ghost] thread_created", { threadId: thread.id, tier });
  return thread;
}

export async function addThreadMember(threadId: string, ghostProfileId: string, alias: string) {
  const { error } = await supabase.from("ghost_thread_members").insert({
    thread_id: threadId,
    ghost_profile_id: ghostProfileId,
    alias_at_join: alias,
  });
  if (error) throw error;
  console.log("[ghost] thread_member_added", { threadId, ghostProfileId });
}

export async function getGhostThreads(ghostProfileId: string) {
  const { data, error } = await supabase
    .from("ghost_thread_members")
    .select("thread_id, alias_at_join, joined_at, ghost_threads(*)")
    .eq("ghost_profile_id", ghostProfileId)
    .order("joined_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// ─── Message Sending ─────────────────────────────────────

export async function sendGhostMessage(params: {
  threadId: string;
  senderGhostProfileId: string;
  senderAlias: string;
  encryptedPayload: string;
  nonce: string;
  aad?: string;
  keyVersion?: number;
  tier: GhostTier;
}) {
  const policy = getGhostPolicy(params.tier);
  const expiresAt = policy.messageTtlSeconds
    ? new Date(Date.now() + policy.messageTtlSeconds * 1000).toISOString()
    : null;

  const { data, error } = await supabase
    .from("ghost_messages")
    .insert({
      thread_id: params.threadId,
      sender_ghost_profile_id: params.senderGhostProfileId,
      sender_alias: params.senderAlias,
      encrypted_payload: params.encryptedPayload,
      nonce: params.nonce,
      aad: params.aad ?? null,
      key_version: params.keyVersion ?? 1,
      expires_at: expiresAt,
    })
    .select("*")
    .single();

  if (error) throw error;
  console.log("[ghost] message_sent", { threadId: params.threadId, messageId: data.id });
  return data;
}

export async function getThreadMessages(threadId: string, limit = 50) {
  const { data, error } = await supabase
    .from("ghost_messages")
    .select("*")
    .eq("thread_id", threadId)
    .is("burned_at", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;

  // Filter expired messages client-side
  const now = Date.now();
  return (data ?? []).filter(m => !m.expires_at || new Date(m.expires_at).getTime() > now);
}

export async function burnMessage(messageId: string) {
  const { error } = await supabase
    .from("ghost_messages")
    .update({ burned_at: new Date().toISOString() })
    .eq("id", messageId);

  if (error) throw error;
  console.log("[ghost] message_burned", { messageId });
}

export function subscribeGhostThread(threadId: string, onMessage: (msg: any) => void) {
  return supabase
    .channel(`ghost-thread:${threadId}`)
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "ghost_messages",
      filter: `thread_id=eq.${threadId}`,
    }, payload => onMessage(payload.new))
    .subscribe();
}

// ─── Anti-Replay ─────────────────────────────────────────

const seenNonces = new Map<string, number>();

export function checkReplay(nonce: string, tier: GhostTier): boolean {
  const policy = getGhostPolicy(tier);
  const now = Date.now();

  // Cleanup old nonces
  for (const [k, t] of seenNonces) {
    if (now - t > policy.antiReplayWindowMs) seenNonces.delete(k);
  }

  if (seenNonces.has(nonce)) {
    console.warn("[ghost] replay_detected", { nonce });
    return false;
  }

  seenNonces.set(nonce, now);
  return true;
}
