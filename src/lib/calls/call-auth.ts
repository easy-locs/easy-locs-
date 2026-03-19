/**
 * Call Auth — Short-lived room-bound authorization tokens.
 */
import { supabase } from "@/integrations/supabase/client";

type CallAuthScope = "offer" | "answer" | "ice" | "media" | "full";

async function hashToken(token: string): Promise<string> {
  const encoded = new TextEncoder().encode(token);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("");
}

export async function createCallAuthToken(
  userId: string,
  roomId: string,
  scope: CallAuthScope = "full",
  ttlSeconds = 120
) {
  const token = crypto.randomUUID();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  const { data, error } = await supabase
    .from("call_auth_tokens")
    .insert({
      user_id: userId,
      room_id: roomId,
      token_hash: tokenHash,
      scope,
      expires_at: expiresAt,
    })
    .select("id, expires_at")
    .single();

  if (error) throw error;
  console.log("[call-vault] auth_token_created", { roomId, scope, ttl: ttlSeconds });
  return { token, tokenId: data.id, expiresAt: data.expires_at };
}

export async function validateCallAuthToken(
  userId: string,
  roomId: string,
  token: string,
  requiredScope: CallAuthScope
): Promise<{ valid: boolean; reason?: string }> {
  const tokenHash = await hashToken(token);

  const { data } = await supabase
    .from("call_auth_tokens")
    .select("*")
    .eq("user_id", userId)
    .eq("room_id", roomId)
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!data) {
    console.warn("[call-vault] auth_token_invalid", { roomId, reason: "not_found" });
    return { valid: false, reason: "not_found" };
  }

  if (data.used_at) {
    console.warn("[call-vault] auth_token_reused", { roomId });
    return { valid: false, reason: "already_used" };
  }

  if (new Date(data.expires_at).getTime() < Date.now()) {
    console.warn("[call-vault] auth_token_expired", { roomId });
    return { valid: false, reason: "expired" };
  }

  if (data.scope !== "full" && data.scope !== requiredScope) {
    console.warn("[call-vault] auth_token_scope_mismatch", { roomId, expected: requiredScope, got: data.scope });
    return { valid: false, reason: "scope_mismatch" };
  }

  // Mark as used
  await supabase
    .from("call_auth_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", data.id);

  console.log("[call-vault] auth_token_validated", { roomId, scope: requiredScope });
  return { valid: true };
}

export async function revokeCallAuthTokens(userId: string, roomId: string) {
  // Mark all unused tokens for this room as expired by setting used_at
  await supabase
    .from("call_auth_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("room_id", roomId)
    .is("used_at", null);

  console.log("[call-vault] auth_tokens_revoked", { roomId });
}
