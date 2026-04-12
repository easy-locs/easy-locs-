import { useEffect, useState } from "react";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { db } from "@/services/db";

export interface WalletAccount {
  id: string;
  owner_user_id: string;
  currency: string;
  balance: number;
  status: string;
  account_type?: string;
  label?: string;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export function useWalletAccounts(ownerUserId?: string) {
  const [rows, setRows] = useState<WalletAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerUserId) return;

    let mounted = true;

    const load = async () => {
      const { data } = await db("wallet_accounts")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (!mounted) return;
      setRows((data ?? []) as WalletAccount[]);
      setLoading(false);
    };

    load();

    const channel = createRealtimeChannel(`wallet-accounts:${ownerUserId}`);
    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "wallet_accounts" }, load)
      .subscribe((status: string) => {
        if (status === "CHANNEL_ERROR") {
          console.error(`[useWalletAccounts] Realtime channel error for user ${ownerUserId}`);
        } else if (status === "TIMED_OUT") {
          console.warn(`[useWalletAccounts] Realtime channel timed out for user ${ownerUserId}`);
        }
      });

    return () => {
      mounted = false;
      removeRealtimeChannel(channel);
    };
  }, [ownerUserId]);

  return { rows, loading };
}
