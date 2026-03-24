/**
 * unifiedResolver — SINGLE source of truth for all payment target resolution.
 * Used by: QR scan, PaymentConfirmPage, WalletTransferPage, PayActionSheet.
 * Resolves userId / orbitId / email → enriched target with wallet validation.
 *
 * IMPORTANT: profiles table uses columns: id, email, name, first_name, last_name
 * NOT full_name, username, avatar_url, orbit_id — those do NOT exist.
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
  timings?: {
    recipientResolveMs: number;
    walletResolveMs: number;
  };
}

/**
 * Build display name from profiles table columns.
 */
function buildDisplayName(row: any): string | null {
  if (row.first_name || row.last_name) {
    return [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || null;
  }
  return row.name?.trim() || null;
}

async function findProfile(input: {
  userId?: string | null;
  orbitId?: string | null;
  email?: string | null;
}): Promise<{ id: string; display_name: string | null; email: string | null } | null> {
  // profiles table columns: id, email, name, first_name, last_name
  const selectCols = "id, email, name, first_name, last_name";

  if (input.userId) {
    console.log("[resolver] findProfile by userId:", input.userId);
    const { data, error } = await (supabase as any)
      .from("profiles")
      .select(selectCols)
      .eq("id", input.userId)
      .maybeSingle();
    console.log("[resolver] profile by userId result:", { data: !!data, error: error?.message });
    if (data) return { id: data.id, display_name: buildDisplayName(data), email: data.email };
  }

  if (input.orbitId) {
    // Try orbit_profiles_v2 table which has the orbit_id → user_id mapping
    console.log("[resolver] findProfile by orbitId:", input.orbitId);
    const { data: orbitRow } = await (supabase as any)
      .from("orbit_profiles_v2")
      .select("user_id")
      .eq("orbit_id", input.orbitId)
      .maybeSingle();
    if (orbitRow?.user_id) {
      const { data } = await (supabase as any)
        .from("profiles")
        .select(selectCols)
        .eq("id", orbitRow.user_id)
        .maybeSingle();
      if (data) return { id: data.id, display_name: buildDisplayName(data), email: data.email };
    }
  }

  if (input.email) {
    console.log("[resolver] findProfile by email:", input.email);
    const { data } = await (supabase as any)
      .from("profiles")
      .select(selectCols)
      .eq("email", input.email.trim().toLowerCase())
      .maybeSingle();
    console.log("[resolver] profile by email result:", { data: !!data });
    if (data) return { id: data.id, display_name: buildDisplayName(data), email: data.email };
  }

  console.warn("[resolver] findProfile FAILED — no match for:", input);
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
  console.log("[resolver] resolveUnifiedTarget input:", JSON.stringify(input));

  // Path A: resolve by walletId first
  if (input.walletId && !input.userId) {
    const walletStart = performance.now();
    const { data: wallet } = await supabase
      .from("wallet_accounts")
      .select("id, owner_user_id, currency, status")
      .eq("id", input.walletId)
      .maybeSingle();
    const walletResolveMs = performance.now() - walletStart;
    console.log("[resolver] wallet by id:", { found: !!wallet, status: wallet?.status });

    if (!wallet?.owner_user_id) return null;

    const recipientStart = performance.now();
    const profile = await findProfile({ userId: wallet.owner_user_id });
    const recipientResolveMs = performance.now() - recipientStart;

    return {
      id: wallet.owner_user_id,
      display_name: profile?.display_name || null,
      email: profile?.email || null,
      avatar_url: null,
      orbit_id: null,
      wallet_id: wallet.id,
      wallet_status: wallet.status ?? "missing",
      currency: wallet.currency ?? currency,
      timings: { recipientResolveMs, walletResolveMs },
    };
  }

  // Path B: resolve by userId
  if (input.userId) {
    const recipientStart = performance.now();
    const walletStart = performance.now();

    const [profile, wallet] = await Promise.all([
      findProfile({ userId: input.userId }),
      supabase
        .from("wallet_accounts")
        .select("id, status")
        .eq("owner_user_id", input.userId)
        .eq("status", "active")
        .limit(1)
        .maybeSingle()
        .then(({ data }) => data),
    ]);

    const recipientResolveMs = performance.now() - recipientStart;
    let walletResolveMs = performance.now() - walletStart;
    console.log("[resolver] path B:", { profileFound: !!profile, walletFound: !!wallet, walletStatus: wallet?.status });

    if (!profile) {
      console.error("[resolver] CRITICAL: userId exists in QR but NOT in profiles table:", input.userId);
      return null;
    }

    // Auto-provision wallet via SECURITY DEFINER RPC (bypasses RLS)
    let finalWallet = wallet;
    if (!wallet && profile.id) {
      console.log("[resolver] auto-provisioning wallet via RPC for recipient:", profile.id);
      const provStart = performance.now();
      try {
        const { data: rpcResult, error: rpcErr } = await supabase
          .rpc("ensure_wallet_account", { target_user_id: profile.id, target_currency: currency });
        if (rpcErr) {
          console.error("[resolver] RPC ensure_wallet_account FAILED:", rpcErr.message, rpcErr.code, rpcErr.details);
          // Expose structured error for callers to handle
          throw new Error(`Wallet provisioning failed: ${rpcErr.message}`);
        } else if (rpcResult && (rpcResult as any).wallet_id) {
          finalWallet = { id: (rpcResult as any).wallet_id, status: (rpcResult as any).status ?? "active" };
          console.log("[resolver] wallet provisioned:", { walletId: finalWallet.id, status: finalWallet.status, action: "auto_created_or_existing" });
        } else {
          console.error("[resolver] RPC returned empty result for:", profile.id);
        }
      } catch (e: any) {
        console.error("[resolver] RPC exception:", e?.message);
      }
      walletResolveMs = performance.now() - provStart;
    }

    return {
      id: profile.id,
      display_name: profile.display_name || null,
      email: profile.email || null,
      avatar_url: null,
      orbit_id: input.orbitId || null,
      wallet_id: finalWallet?.id ?? null,
      wallet_status: finalWallet?.status ?? "missing",
      currency,
      timings: { recipientResolveMs, walletResolveMs },
    };
  }

  // Path C: resolve by orbitId or email
  const recipientStart = performance.now();
  const profile = await findProfile(input);
  const recipientResolveMs = performance.now() - recipientStart;
  if (!profile) return null;

  const walletStart = performance.now();
  let { data: wallet } = await supabase
    .from("wallet_accounts")
    .select("id, status")
    .eq("owner_user_id", profile.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  // Auto-provision wallet via SECURITY DEFINER RPC
  if (!wallet) {
    console.log("[resolver] path C auto-provisioning wallet via RPC for:", profile.id);
    try {
      const { data: rpcResult, error: rpcErr } = await supabase
        .rpc("ensure_wallet_account", { target_user_id: profile.id, target_currency: currency });
      if (rpcErr) {
        console.error("[resolver] path C RPC FAILED:", rpcErr.message, rpcErr.code, rpcErr.details);
        throw new Error(`Wallet provisioning failed: ${rpcErr.message}`);
      } else if (rpcResult && (rpcResult as any).wallet_id) {
        wallet = { id: (rpcResult as any).wallet_id, status: (rpcResult as any).status ?? "active" };
        console.log("[resolver] path C wallet provisioned:", { walletId: (wallet as any).id, status: (wallet as any).status });
      } else {
        console.error("[resolver] path C RPC returned empty for:", profile.id);
      }
    } catch (e: any) {
      console.error("[resolver] path C RPC exception:", e?.message);
    }
  }
  const walletResolveMs = performance.now() - walletStart;

  return {
    id: profile.id,
    display_name: profile.display_name || null,
    email: profile.email || null,
    avatar_url: null,
    orbit_id: input.orbitId || null,
    wallet_id: wallet?.id ?? null,
    wallet_status: wallet?.status ?? "missing",
    currency,
    timings: { recipientResolveMs, walletResolveMs },
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
