import { supabase } from "@/integrations/supabase/client";

interface ProfileRow {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  email: string | null;
}

interface WalletBalanceRow {
  user_id: string;
  balance: number;
  currency: string;
}

interface UnifiedWalletTxRow {
  id: string;
  created_at: string;
  sender_id: string | null;
  recipient_id: string | null;
  amount: number;
  currency: string;
  context_type: string;
  context_id: string | null;
  title: string | null;
  subtitle: string | null;
  status: string;
  metadata: Record<string, unknown>;
  reference_code: string | null;
}

function untypedFrom(table: string) {
  return (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }).from(table);
}

interface OrbitProfileRow {
  id: string;
  orbit_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

export const typedQueries = {
  profiles: {
    selectById(ids: string | string[]) {
      const idList = Array.isArray(ids) ? ids : [ids];
      return untypedFrom("profiles")
        .select("id, name, first_name, last_name, username, email")
        .in("id", idList) as unknown as PromiseLike<{ data: ProfileRow[] | null; error: unknown }>;
    },
    selectByEmail(email: string) {
      return untypedFrom("profiles")
        .select("id, name, first_name, last_name, username, email")
        .eq("email", email)
        .maybeSingle() as unknown as PromiseLike<{ data: ProfileRow | null; error: unknown }>;
    },
    selectIdByEmail(email: string) {
      return untypedFrom("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle() as unknown as PromiseLike<{ data: { id: string } | null; error: unknown }>;
    },
  },

  orbitProfiles: {
    selectByOrbitId(orbitId: string) {
      return untypedFrom("orbit_profiles_v2")
        .select("id, orbit_id, display_name, avatar_url")
        .eq("orbit_id", orbitId)
        .maybeSingle() as unknown as PromiseLike<{ data: Pick<OrbitProfileRow, "id" | "orbit_id" | "display_name" | "avatar_url"> | null; error: unknown }>;
    },
    selectByUserId(userId: string) {
      return untypedFrom("orbit_profiles_v2")
        .select("id, orbit_id, display_name, avatar_url, email")
        .eq("id", userId)
        .maybeSingle() as unknown as PromiseLike<{ data: OrbitProfileRow | null; error: unknown }>;
    },
  },

  walletBalances: {
    selectByUser(userId: string) {
      return untypedFrom("wallet_balances_v2")
        .select("balance, currency")
        .eq("user_id", userId)
        .maybeSingle() as unknown as PromiseLike<{ data: Pick<WalletBalanceRow, "balance" | "currency"> | null; error: unknown }>;
    },
  },

  walletTransactions: {
    selectForUser(userId: string, limit: number) {
      return untypedFrom("unified_wallet_transactions")
        .select("*")
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(limit) as unknown as PromiseLike<{ data: UnifiedWalletTxRow[] | null; error: unknown }>;
    },
    selectTodaySentTotal(userId: string) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return untypedFrom("unified_wallet_transactions")
        .select("amount")
        .eq("sender_id", userId)
        .in("status", ["completed", "pending"])
        .gte("created_at", todayStart.toISOString()) as unknown as PromiseLike<{ data: { amount: number }[] | null; error: unknown }>;
    },
    insertRequest(row: Record<string, unknown>) {
      return untypedFrom("unified_wallet_transactions")
        .insert(row) as unknown as PromiseLike<{ error: unknown }>;
    },
  },

  walletAccounts: {
    selectByUser(userId: string) {
      return untypedFrom("wallet_accounts")
        .select("id, currency")
        .eq("owner_user_id", userId)
        .maybeSingle() as unknown as PromiseLike<{ data: { id: string; currency: string } | null; error: unknown }>;
    },
    selectBalanceByWallet(walletId: string) {
      return untypedFrom("wallet_accounts")
        .select("balance, available_balance, currency")
        .eq("id", walletId)
        .maybeSingle() as unknown as PromiseLike<{ data: { balance: number; available_balance: number; currency: string } | null; error: unknown }>;
    },
  },

  storefrontPages: {
    countByOwner(userId: string) {
      return untypedFrom("storefront_pages")
        .select("id", { count: "exact", head: true })
        .eq("owner_user_id", userId) as unknown as PromiseLike<{ count: number | null; error: unknown }>;
    },
    selectByOwner(userId: string) {
      return untypedFrom("storefront_pages")
        .select("id, name, slug, logo_url, banner_url, description, contact_email, contact_phone, address, city, country, latitude, longitude, shop_visibility, is_verified, active, rating, reviews_count, views_count, currency, theme_color")
        .eq("owner_user_id", userId)
        .order("created_at", { ascending: false }) as unknown as PromiseLike<{ data: Record<string, unknown>[] | null; error: unknown }>;
    },
  },

  properties: {
    countByUser(userId: string) {
      return untypedFrom("properties")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId) as unknown as PromiseLike<{ count: number | null; error: unknown }>;
    },
  },

  riderProfiles: {
    existsByUser(userId: string) {
      return untypedFrom("rider_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle() as unknown as PromiseLike<{ data: { id: string } | null; error: unknown }>;
    },
  },

  marketplaceProviders: {
    existsByUser(userId: string) {
      return untypedFrom("marketplace_providers")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle() as unknown as PromiseLike<{ data: { id: string } | null; error: unknown }>;
    },
    countServicesByUser(userId: string) {
      return untypedFrom("marketplace_services")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId) as unknown as PromiseLike<{ count: number | null; error: unknown }>;
    },
  },

  loyaltyAccounts: {
    selectByUser(userId: string) {
      return untypedFrom("loyalty_accounts")
        .select("points_balance, tier")
        .eq("user_id", userId)
        .maybeSingle() as unknown as PromiseLike<{ data: { points_balance: number; tier: string } | null; error: unknown }>;
    },
  },

  walletSummary: {
    selectMainByUser(userId: string) {
      return untypedFrom("wallet_accounts")
        .select("balance, currency")
        .eq("owner_user_id", userId)
        .eq("account_type", "main")
        .maybeSingle() as unknown as PromiseLike<{ data: { balance: number; currency: string } | null; error: unknown }>;
    },
  },
};

export type { ProfileRow, WalletBalanceRow, UnifiedWalletTxRow };
