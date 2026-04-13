import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useWalletRealtime } from "@/hooks/useWalletRealtime";
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";

export function useCanonicalWalletBridge() {
  const wallet = useWalletRealtime();
  const navigate = useNavigate();

  const refreshRef = useRef(wallet.refreshWallet);
  refreshRef.current = wallet.refreshWallet;

  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    const unsubs = [
      platformBus.on(APP_EVENTS.WALLET_PAYMENT_SUCCESS, () => void refreshRef.current()),
      platformBus.on(APP_EVENTS.WALLET_PAYMENT_FAILED, () => void refreshRef.current()),
      platformBus.on(APP_EVENTS.WALLET_QR_SCANNED, () => void refreshRef.current()),
      platformBus.on(APP_EVENTS.WALLET_BALANCE_UPDATED, () => void refreshRef.current()),

      // wallet:payment_requested from Orbit chat → open Wallet POS flow
      platformBus.on(APP_EVENTS.WALLET_PAYMENT_REQUESTED, (event) => {
        void refreshRef.current();
        const p = event.payload as Record<string, unknown>;
        const state = p?.transactionId
          ? { transactionId: p.transactionId, amount: p.amount, currency: p.currency }
          : undefined;
        navigateRef.current("/pos", { state });
      }),

      // wallet:pos_updated with action:"open" → open POS (direct trigger)
      platformBus.on(APP_EVENTS.WALLET_POS_UPDATED, (event) => {
        void refreshRef.current();
        const p = event.payload as Record<string, unknown>;
        if (p?.action === "open") {
          const state = p?.transactionId
            ? { transactionId: p.transactionId, amount: p.amount, currency: p.currency }
            : undefined;
          navigateRef.current("/pos", { state });
        }
      }),
    ];

    return () => {
      unsubs.forEach((u) => u());
    };
  }, []); // Empty deps — stable via refs

  return wallet;
}
