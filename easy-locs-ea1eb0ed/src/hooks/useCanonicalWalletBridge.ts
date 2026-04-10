import { useEffect, useRef } from "react";
import { useWalletRealtime } from "@/hooks/useWalletRealtime";
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";

export function useCanonicalWalletBridge() {
  const wallet = useWalletRealtime();

  // FIX: Use stable ref to avoid re-subscribing on every render
  // (wallet object is recreated each render since useWalletRealtime returns a new object)
  const refreshRef = useRef(wallet.refreshWallet);
  refreshRef.current = wallet.refreshWallet;

  useEffect(() => {
    const unsubs = [
      platformBus.on(APP_EVENTS.WALLET_PAYMENT_SUCCESS, () => void refreshRef.current()),
      platformBus.on(APP_EVENTS.WALLET_PAYMENT_FAILED, () => void refreshRef.current()),
      platformBus.on(APP_EVENTS.WALLET_QR_SCANNED, () => void refreshRef.current()),
      platformBus.on(APP_EVENTS.WALLET_POS_UPDATED, () => void refreshRef.current()),
    ];

    return () => {
      unsubs.forEach((u) => u());
    };
  }, []); // Empty deps — stable via refs

  return wallet;
}