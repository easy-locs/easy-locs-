import { supabase } from "@/integrations/supabase/client";
import { db } from "@/services/db";
import { typedQueries } from "@/lib/db/typed-queries";

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

function buildDisplayName(row: Record<string, unknown>): string | null {
  const first = row.first_name as string | undefined;
  const last = row.last_name as string | undefined;
  if (first || last) {
    return [first, last].filter(Boolean).join(" ").trim() || null;
  }
  const name = row.name as string | undefined;
  return name?.trim() || null;
}

async function findProfile(input: {
  userId?: string | null;
  orbitId?: string | null;
  email?: string | null;
  phone?: string | null;
}): Promise<{ id: string; display_name: string | null; email: string | null } | null> {
  if (input.userId) {
    const { data } = await typedQueries.profiles.selectById(input.userId);
    const row = Array.isArray(data) ? data[0] : data;
    if (row) return { id: row.id, display_name: buildDisplayName(row as Record<string, unknown>), email: row.email ?? null };
  }

  if (input.orbitId) {
    const { data: orbitRow } = await typedQueries.orbitProfiles.selectByOrbitId(input.orbitId);
    if (orbitRow?.id) {
      const { data } = await typedQueries.profiles.selectById(orbitRow.id);
      const row = Array.isArray(data) ? data[0] : data;
      if (row) return { id: row.id, display_name: buildDisplayName(row as Record<string, unknown>), email: row.email ?? null };
    }
  }

  if (input.phone) {
    const { data: profileRow } = await db
      .from("profiles")
      .select("id")
      .eq("phone", input.phone.trim())
      .maybeSingle();
    if (profileRow?.id) {
      const { data } = await typedQueries.profiles.selectById(profileRow.id);
      const row = Array.isArray(data) ? data[0] : data;
      if (row) return { id: row.id, display_name: buildDisplayName(row as Record<string, unknown>), email: row.email ?? null };
    }
  }

  if (input.email) {
    const { data } = await typedQueries.profiles.selectByEmail(input.email.trim().toLowerCase());
    if (data) return { id: data.id, display_name: buildDisplayName(data as Record<string, unknown>), email: data.email ?? null };
  }

  return null;
}

interface RpcWalletResult {
  wallet_id?: string;
  status?: string;
}

export async function resolveUnifiedTarget(input: {
  userId?: string | null;
  orbitId?: string | null;
  email?: string | null;
  phone?: string | null;
  walletId?: string | null;
  currency?: string;
}): Promise<UnifiedPayTarget | null> {
  const currency = input.currency || "AED";

  if (input.walletId && !input.userId) {
    const walletStart = performance.now();
    const { data: wallet } = await supabase
      .from("wallet_accounts")
      .select("id, owner_user_id, currency, status")
      .eq("id", input.walletId)
      .maybeSingle();
    const walletResolveMs = performance.now() - walletStart;

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

  if (input.userId) {
    const recipientStart = performance.now();
    const walletStart = performance.now();

    const [profile, wallet] = await Promise.all([
      findProfile({ userId: input.userId }),
      supabase
        .from("wallet_accounts")
        .select("id, status")
        .eq("owner_user_id", input.userId)
        .eq("currency", currency)
        .eq("status", "active")
        .limit(1)
        .maybeSingle()
        .then(({ data }) => data),
    ]);

    const recipientResolveMs = performance.now() - recipientStart;
    let walletResolveMs = performance.now() - walletStart;

    if (!profile) return null;

    let finalWallet = wallet;
    if (!wallet && profile.id) {
      const provStart = performance.now();
      try {
        const { data: rpcResult, error: rpcErr } = await supabase
          .rpc("ensure_wallet_account", { target_user_id: profile.id, target_currency: currency });
        if (rpcErr) {
          throw new Error(`Wallet provisioning failed: ${rpcErr.message}`);
        } else if (rpcResult) {
          const result = rpcResult as unknown as RpcWalletResult;
          if (result.wallet_id) {
            finalWallet = { id: result.wallet_id, status: result.status ?? "active" };
          }
        }
      } catch (e: unknown) {
        console.error("[resolver] RPC exception:", e instanceof Error ? e.message : e);
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

  const recipientStart = performance.now();
  const profile = await findProfile(input);
  const recipientResolveMs = performance.now() - recipientStart;
  if (!profile) return null;

  const walletStart = performance.now();
  let walletData = await supabase
    .from("wallet_accounts")
    .select("id, status")
    .eq("owner_user_id", profile.id)
    .eq("currency", currency)
    .eq("status", "active")
    .limit(1)
    .maybeSingle()
    .then(({ data }) => data);

  if (!walletData) {
    try {
      const { data: rpcResult, error: rpcErr } = await supabase
        .rpc("ensure_wallet_account", { target_user_id: profile.id, target_currency: currency });
      if (rpcErr) {
        throw new Error(`Wallet provisioning failed: ${rpcErr.message}`);
      } else if (rpcResult) {
        const result = rpcResult as unknown as RpcWalletResult;
        if (result.wallet_id) {
          walletData = { id: result.wallet_id, status: result.status ?? "active" };
        }
      }
    } catch (e: unknown) {
      console.error("[resolver] RPC exception:", e instanceof Error ? e.message : e);
    }
  }
  const walletResolveMs = performance.now() - walletStart;

  return {
    id: profile.id,
    display_name: profile.display_name || null,
    email: profile.email || null,
    avatar_url: null,
    orbit_id: input.orbitId || null,
    wallet_id: walletData?.id ?? null,
    wallet_status: walletData?.status ?? "missing",
    currency,
    timings: { recipientResolveMs, walletResolveMs },
  };
}

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
