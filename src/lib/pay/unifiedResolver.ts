/**
 * unifiedResolver — SINGLE source of truth for all payment target resolution.
 * Used by: QR scan, PaymentConfirmPage, WalletTransferPage, PayActionSheet.
 * Resolves userId / orbitId / email → enriched target with wallet validation.
 */
import { supabase } from "@/integrations/supabase/client";

export interface UnifiedPayTarget {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  orbit_id: string | null;
  wallet_id: string | null;
  wallet_status: "active" | "locked" | "missing" | string;
  currency: string;
}

async function findProfile(input: {
  userId?: string | null;
  orbitId?: string | null;
  email?: string | null;
}): Promise<{ id: string; full_name: string | null; username: string | null; avatar_url: string | null; email: string | null } | null> {
  if (input.userId) {
    const { data } = await (supabase as any)
      .from("profiles")
      .select("id, full_name, username, avatar_url, email")
      .eq("id", input.userId)
      .maybeSingle();
    if (data) return data;
  }
  if (input.orbitId) {
    const { data } = await (supabase as any)
      .from("profiles")
      .select("id, full_name, username, avatar_url, email")
      .eq("orbit_id", input.orbitId)
      .maybeSingle();
    if (data) return data;
  }
  if (input.email) {
    const { data } = await (supabase as any)
      .from("profiles")
      .select("id, full_name, username, avatar_url, email")
      .eq("email", input.email.trim().toLowerCase())
      .maybeSingle();
    if (data) return data;
  }
  return null;
}

export async function resolveUnifiedTarget(input: {
  userId?: string | null;
  orbitId?: string | null;
  email?: string | null;
  walletId?: string | null;
  currency?: string;
}): Promise<UnifiedPayTarget | null> {
  const currency = input.currency || "AED";

  // Case 1: resolve from walletId → find owner
  if (input.walletId && !input.userId) {
    const { data: wallet } = await supabase
      .from("wallet_accounts")
      .select("id, owner_user_id, currency, status")
      .eq("id", input.walletId)
      .maybeSingle();

    if (!wallet?.owner_user_id) return null;

    const profile = await findProfile({ userId: wallet.owner_user_id });
    return {
      id: wallet.owner_user_id,
      display_name: profile?.full_name || profile?.username || null,
      email: profile?.email || null,
      avatar_url: profile?.avatar_url || null,
      orbit_id: null,
      wallet_id: wallet.id,
      wallet_status: wallet.status ?? "missing",
      currency: wallet.currency ?? currency,
    };
  }

  // Case 2: resolve from userId / orbitId / email
  const profile = await findProfile(input);
  if (!profile) return null;

  // Enrich with wallet
  const { data: wallet } = await supabase
    .from("wallet_accounts")
    .select("id, status")
    .eq("owner_user_id", profile.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  return {
    id: profile.id,
    display_name: profile.full_name || profile.username || null,
    email: profile.email || null,
    avatar_url: profile.avatar_url || null,
    orbit_id: input.orbitId || null,
    wallet_id: wallet?.id ?? null,
    wallet_status: wallet?.status ?? "missing",
    currency,
  };
}

/** Validate a target is payable */
export function validatePayTarget(
  target: UnifiedPayTarget | null,
  currentUserId?: string
): { ok: boolean; error?: string } {
  if (!target) return { ok: false, error: "Recipient not found" };
  if (currentUserId && target.id === currentUserId) return { ok: false, error: "Cannot pay yourself" };
  if (target.wallet_status === "locked") return { ok: false, error: "Recipient wallet is locked" };
  if (target.wallet_status === "missing" || !target.wallet_id) return { ok: false, error: "Recipient has no active wallet" };
  return { ok: true };
}
