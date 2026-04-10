/**
 * Card Adapters — Global (cross-surface)
 * REACTIVE: uses zustand subscriptions via hooks, not getState() snapshots.
 */
import { useMemo } from "react";
import { buildCardContract, type CardContract } from "../card-contract";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletStore } from "@/stores/walletStore";
import { useOrbitProfileStore } from "@/stores/orbitStore";
import { useNotificationV2Store } from "@/stores/notificationV2Store";

// ── Wallet Balance Card — REACTIVE via zustand hook selector ──
export function useWalletBalanceCard(): CardContract<{ balance: number; currency: string }> {
  const { user } = useAuth();
  // Reactive subscription — re-renders when wallet changes
  const wallet = useWalletStore((s) => s.wallet);
  const loading = useWalletStore((s) => s.loading);

  return useMemo(() => {
    const walletData = wallet
      ? { balance: wallet.availableBalance ?? 0, currency: wallet.currency ?? "AED" }
      : null;

    return buildCardContract({
      id: "wallet_balance",
      domain: "wallet",
      title: "Wallet",
      data: walletData,
      disabled: !user?.id,
      disabledReason: !user?.id ? "Not authenticated" : undefined,
      deepLink: "/wallet",
      primaryAction: {
        label: "Top Up",
        actionType: "business" as const,
        run: async () => {
          const { platformBus } = await import("@/lib/shared/platform-bus");
          platformBus.emit("wallet:top_up", { userId: user!.id }, "walletBalanceCard");
        },
      },
    });
  }, [wallet, loading, user?.id]);
}

// ── Orbit Recent Chats Card — REACTIVE via zustand hook selector ──
export function useOrbitRecentChatsCard(): CardContract<{
  hasProfile: boolean;
  displayName: string | null;
}> {
  const { user } = useAuth();
  // Reactive subscription — re-renders when orbit profile changes
  const profile = useOrbitProfileStore((s) => s.profile);
  const loading = useOrbitProfileStore((s) => s.loading);

  return useMemo(() => {
    const data = profile
      ? { hasProfile: true, displayName: (profile as any).displayName || (profile as any).display_name || null }
      : null;

    return buildCardContract({
      id: "orbit_recent_chats",
      domain: "orbit",
      title: "Messages",
      data,
      disabled: !user?.id,
      disabledReason: !user?.id ? "Not authenticated" : undefined,
      deepLink: "/orbit",
      primaryAction: {
        label: "Open Messages",
        actionType: "navigation" as const,
        run: () => { window.location.href = "/orbit"; },
      },
    });
  }, [profile, loading, user?.id]);
}

// ── Notifications Badge Card — REACTIVE via zustand hook selector ──
export function useNotificationsBadgeCard(): CardContract<{ count: number }> {
  const { user } = useAuth();
  // Reactive subscription — re-renders when unreadCount changes
  const unreadCount = useNotificationV2Store((s) => s.unreadCount);
  const hydrated = useNotificationV2Store((s) => s.hydrated);

  return useMemo(
    () =>
      buildCardContract({
        id: "notifications_badge",
        domain: "notifications",
        title: "Notifications",
        data: hydrated ? { count: unreadCount } : null,
        disabled: !user?.id,
        disabledReason: !user?.id ? "Not authenticated" : undefined,
        deepLink: "/notifications",
        primaryAction: {
          label: "View All",
          actionType: "navigation" as const,
          run: () => { window.location.href = "/notifications"; },
        },
      }),
    [unreadCount, hydrated, user?.id],
  );
}
