import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useWalletAccounts(ownerUserId?: string) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerUserId) return;

    let mounted = true;

    const load = async () => {
      const { data } = await supabase
        .from("wallet_accounts")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .order("created_at", { ascending: false });

      if (!mounted) return;
      setRows(data ?? []);
      setLoading(false);
    };

    load();

    const sub = supabase
      .channel(`wallet-accounts:${ownerUserId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "wallet_accounts" }, load)
      .subscribe();

    return () => {
      mounted = false;
      sub.unsubscribe();
    };
  }, [ownerUserId]);

  return { rows, loading };
}
