/**
 * resolvePayTarget — Unified target resolution for all pay flows.
 * Resolves userId, orbitId, or email → full profile + wallet validation.
 * Used by PaymentConfirmPage and WalletTransferPage.
 */
import { supabase } from "@/integrations/supabase/client";

export interface ResolvedTarget {
  id: string;
  orbit_id: string | null;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  wallet_id: string | null;
  wallet_status: "active" | "locked" | "missing" | string;
}

async function enrichWithWallet(
  userId: string,
  base: Omit<ResolvedTarget, "wallet_id" | "wallet_status">
): Promise<ResolvedTarget> {
  try {
    const { data: wallet } = await supabase
      .from("wallet_accounts")
      .select("id, status")
      .eq("owner_user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    return {
      ...base,
      wallet_id: wallet?.id ?? null,
      wallet_status: wallet?.status ?? "missing",
    };
  } catch {
    return { ...base, wallet_id: null, wallet_status: "missing" };
  }
}

export async function resolvePayTarget(input: {
  userId?: string | null;
  orbitId?: string | null;
  email?: string | null;
}): Promise<ResolvedTarget | null> {
  // Try userId first
  if (input.userId) {
    const { data } = await (supabase as any)
      .from("profiles")
      .select("id, username, full_name, avatar_url, email")
      .eq("id", input.userId)
      .maybeSingle();
    if (data) return enrichWithWallet(data.id, {
      id: data.id,
      orbit_id: null,
      email: data.email || null,
      display_name: data.full_name || data.username || null,
      avatar_url: data.avatar_url || null,
    });
  }

  // Try orbitId
  if (input.orbitId) {
    const { data } = await (supabase as any)
      .from("profiles")
      .select("id, username, full_name, avatar_url, email")
      .eq("orbit_id", input.orbitId)
      .maybeSingle();
    if (data) return enrichWithWallet(data.id, {
      id: data.id,
      orbit_id: input.orbitId,
      email: data.email || null,
      display_name: data.full_name || data.username || null,
      avatar_url: data.avatar_url || null,
    });
  }

  // Try email
  if (input.email) {
    const normalized = input.email.trim().toLowerCase();
    const { data } = await (supabase as any)
      .from("profiles")
      .select("id, username, full_name, avatar_url, email")
      .eq("email", normalized)
      .maybeSingle();
    if (data) return enrichWithWallet(data.id, {
      id: data.id,
      orbit_id: null,
      email: data.email || null,
      display_name: data.full_name || data.username || null,
      avatar_url: data.avatar_url || null,
    });
  }

  return null;
}
