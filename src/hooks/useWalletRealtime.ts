import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";

export function useWalletRealtime() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setWallet(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data } = await supabase
      .from("wallet_accounts")
      .select("*")
      .eq("owner_user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    setWallet(data ?? null);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void refresh();

    if (!user?.id) return;

    const walletChannel = supabase
      .channel(`wallet:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wallet_transactions_v2",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void refresh();
          platformBus.emit(APP_EVENTS.WALLET_BALANCE_UPDATED, { userId: user.id }, "wallet");
          platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, { userId: user.id }, "wallet");
          platformBus.emit(APP_EVENTS.NOTIFICATIONS_REFRESH, { userId: user.id }, "wallet");
        }
      )
      .subscribe();

    const unsubs = [
      platformBus.on(APP_EVENTS.WALLET_PAYMENT_SUCCESS, () => void refresh()),
      platformBus.on(APP_EVENTS.WALLET_PAYMENT_FAILED, () => void refresh()),
      platformBus.on(APP_EVENTS.WALLET_QR_SCANNED, () => void refresh()),
    ];

    return () => {
      supabase.removeChannel(walletChannel);
      unsubs.forEach((u) => u());
    };
  }, [refresh, user?.id]);

  return {
    walletAccount: wallet,
    walletLoading: loading,
    refreshWallet: refresh,
  };
}
