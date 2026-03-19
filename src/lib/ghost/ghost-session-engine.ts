/**
 * Ghost Session Engine — Ephemeral sessions with TTL, token hashing, auto-expiry.
 */
import { supabase } from "@/integrations/supabase/client";
import { getGhostPolicy, GhostTier } from "./ghost-policy";

async function hashToken(token: string): Promise<string> {
  const encoded = new TextEncoder().encode(token);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("");
}

export async function createGhostSession(ghostProfileId: string, tier: GhostTier) {
  const policy = getGhostPolicy(tier);
  const token = crypto.randomUUID();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + policy.sessionTtlMs).toISOString();

  const { data, error } = await supabase
    .from("ghost_sessions")
    .insert({
      ghost_profile_id: ghostProfileId,
      session_token_hash: tokenHash,
      tier,
      status: "active",
      expires_at: expiresAt,
    })
    .select("*")
    .single();

  if (error) throw error;

  // Store token locally (never sent to server in plaintext)
  sessionStorage.setItem("ghost:session-token", token);
  sessionStorage.setItem("ghost:session-id", data.id);
  sessionStorage.setItem("ghost:profile-id", ghostProfileId);
  sessionStorage.setItem("ghost:tier", tier);
  sessionStorage.setItem("ghost:expires-at", expiresAt);

  console.log("[ghost] session_created", { sessionId: data.id, tier, expiresAt });
  return { session: data, token };
}

export function getLocalGhostSession() {
  const sessionId = sessionStorage.getItem("ghost:session-id");
  const profileId = sessionStorage.getItem("ghost:profile-id");
  const tier = sessionStorage.getItem("ghost:tier") as GhostTier | null;
  const expiresAt = sessionStorage.getItem("ghost:expires-at");
  const token = sessionStorage.getItem("ghost:session-token");

  if (!sessionId || !profileId || !tier || !expiresAt) return null;

  const expired = new Date(expiresAt).getTime() < Date.now();
  if (expired) {
    clearLocalGhostSession();
    return null;
  }

  return { sessionId, profileId, tier, expiresAt, token };
}

export function clearLocalGhostSession() {
  const keys = ["ghost:session-token", "ghost:session-id", "ghost:profile-id", "ghost:tier", "ghost:expires-at"];
  keys.forEach(k => {
    // Secure overwrite before removal
    sessionStorage.setItem(k, crypto.randomUUID());
    sessionStorage.removeItem(k);
  });
  console.log("[ghost] session_cleared");
}

export async function revokeGhostSession(sessionId: string) {
  const { error } = await supabase
    .from("ghost_sessions")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (error) console.warn("[ghost] revoke_failed", error);
  clearLocalGhostSession();
  console.log("[ghost] session_revoked", { sessionId });
}

export async function validateGhostSession(sessionId: string): Promise<boolean> {
  const { data } = await supabase
    .from("ghost_sessions")
    .select("status, expires_at")
    .eq("id", sessionId)
    .single();

  if (!data) return false;
  if (data.status !== "active") return false;
  if (new Date(data.expires_at).getTime() < Date.now()) return false;
  return true;
}

let expiryTimer: ReturnType<typeof setInterval> | null = null;

export function startGhostSessionMonitor(onExpired: () => void): () => void {
  if (expiryTimer) clearInterval(expiryTimer);

  expiryTimer = setInterval(() => {
    const session = getLocalGhostSession();
    if (!session) {
      onExpired();
      if (expiryTimer) { clearInterval(expiryTimer); expiryTimer = null; }
    }
  }, 5000);

  return () => { if (expiryTimer) { clearInterval(expiryTimer); expiryTimer = null; } };
}
