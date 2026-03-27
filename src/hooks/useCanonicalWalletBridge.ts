import { useEffect } from "react";
import { useWalletRealtime } from "@/hooks/useWalletRealtime";
import { platformBus } from "@/lib/shared/platform-bus";
import { CANONICAL_APP_EVENTS } from "@/lib/app-shell/canonical-app-events";

export function useCanonicalWalletBridge() {
  const wallet = useWalletRealtime();

  useEffect(() => {
    const unsubs = [
      platformBus.on(CANONICAL_APP_EVENTS.WALLET_PAYMENT_SUCCESS, () => void wallet.refreshWallet()),
      platformBus.on(CANONICAL_APP_EVENTS.WALLET_PAYMENT_FAILED, () => void wallet.refreshWallet()),
      platformBus.on(CANONICAL_APP_EVENTS.WALLET_QR_SCANNED, () => void wallet.refreshWallet()),
      platformBus.on(CANONICAL_APP_EVENTS.WALLET_POS_UPDATED, () => void wallet.refreshWallet()),
    ];

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [wallet]);

  return wallet;
}
