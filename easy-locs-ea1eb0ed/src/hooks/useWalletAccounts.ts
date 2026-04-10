import { useEffect, useState } from "react";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { db } from "@/services/db";

export function useWalletAccounts(ownerUserId?: string) {
  const [rows, setRows] = useState<any[]>([]);
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
      setRows(data ?? []);
      setLoading(false);
    };

    load();

    const channel = createRealtimeChannel(`wallet-accounts:${ownerUserId}`);
    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "wallet_accounts" }, load)
      .subscribe();

    return () => {
      mounted = false;
      removeRealtimeChannel(channel);
    };
  }, [ownerUserId]);

  return { rows, loading };
}
