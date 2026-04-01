/**
 * Card Adapters — Global (cross-surface)
 */
import { useMemo } from "react";
import { buildCardContract, type CardContract } from "../card-contract";
import { useAuth } from "@/contexts/AuthContext";

// ── Wallet Balance Card ──
export function useWalletBalanceCard(): CardContract<{ balance: number; currency: string }> {
  const { user } = useAuth();

  return useMemo(() => {
    let walletData: { balance: number; currency: string } | null = null;
    try {
      const { useWalletStore } = require("@/stores/walletStore");
      const wallet = useWalletStore.getState().wallet;
      if (wallet) {
        walletData = {
          balance: wallet.availableBalance ?? 0,
          currency: wallet.currency ?? "AED",
        };
      }
    } catch {
      // store not yet initialized
    }

    return buildCardContract({
      id: "wallet_balance",
      domain: "wallet",
      title: "Wallet",
      data: walletData,
      disabled: !user?.id,
      disabledReason: !user?.id ? "Not authenticated" : undefined,
      deepLink: "/wallet/hub",
      primaryAction: {
        label: "Top Up",
        run: async () => {
          const { platformBus } = await import("@/lib/shared/platform-bus");
          platformBus.emit("wallet:top_up", { userId: user!.id }, "walletBalanceCard");
        },
      },
    });
  }, [user?.id]);
}

// ── Orbit Recent Chats Card ──
export function useOrbitRecentChatsCard(): CardContract<{ unreadCount: number }> {
  const { user } = useAuth();

  return useMemo(() => {
    let orbitData: { unreadCount: number } | null = null;
    try {
      const { useOrbitStore } = require("@/stores/orbitStore");
      const state = useOrbitStore.getState();
      orbitData = { unreadCount: state.unreadCount ?? 0 };
    } catch {
      // store not yet initialized
    }

    return buildCardContract({
      id: "orbit_recent_chats",
      domain: "orbit",
      title: "Messages",
      data: orbitData,
      disabled: !user?.id,
      disabledReason: !user?.id ? "Not authenticated" : undefined,
      deepLink: "/orbit",
      primaryAction: {
        label: "Open Messages",
        run: () => { window.location.href = "/orbit"; },
      },
    });
  }, [user?.id]);
}

// ── Notifications Badge Card ──
export function useNotificationsBadgeCard(): CardContract<{ count: number }> {
  const { user } = useAuth();

  return useMemo(
    () =>
      buildCardContract({
        id: "notifications_badge",
        domain: "notifications",
        title: "Notifications",
        data: null,
        disabled: !user?.id,
        disabledReason: !user?.id ? "Not authenticated" : undefined,
        deepLink: "/notifications",
        primaryAction: {
          label: "View All",
          run: () => { window.location.href = "/notifications"; },
        },
      }),
    [user?.id],
  );
}
