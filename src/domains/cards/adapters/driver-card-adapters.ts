/**
 * Card Adapters — Driver Surface
 * Canonical adapters for driver-specific cards.
 */
import { useMemo } from "react";
import { buildCardContract, type CardContract } from "../card-contract";
import { useAuth } from "@/contexts/AuthContext";
import { useDriverLive } from "@/hooks/useDriverLive";

// ── Driver Status Card ──
export function useDriverStatusCard(): CardContract<{
  isOnline: boolean;
  isAvailable: boolean;
  currentStatus: string;
}> {
  const { user } = useAuth();
  const { data: profile, error } = useDriverLive(user?.id ?? null);

  return useMemo(() => {
    const p = profile as any;
    return buildCardContract({
      id: "driver_status",
      domain: "delivery",
      title: "Driver Status",
      data: p
        ? {
            isOnline: !!p.is_online,
            isAvailable: !!p.is_available,
            currentStatus: p.current_status || "idle",
          }
        : null,
      error: error?.message,
      disabled: !user?.id,
      disabledReason: !user?.id ? "Not authenticated" : undefined,
      deepLink: "/driver",
      primaryAction: p
        ? {
            label: p.is_online ? "Go Offline" : "Go Online",
            run: async () => {
              const { platformBus } = await import("@/lib/shared/platform-bus");
              platformBus.emit("driver:toggle_online", { driverId: user!.id }, "driverStatusCard");
            },
          }
        : undefined,
    });
  }, [profile, error, user?.id]);
}

// ── Driver Positioning Card ──
export function useDriverPositioningCard(): CardContract<{ zone: string | null }> {
  const { user } = useAuth();

  return useMemo(
    () =>
      buildCardContract({
        id: "driver_positioning",
        domain: "delivery",
        title: "Smart Positioning",
        data: { zone: null },
        disabled: !user?.id,
        disabledReason: !user?.id ? "Not authenticated" : undefined,
        deepLink: "/driver",
        primaryAction: {
          label: "Find Best Zone",
          run: async () => {
            const { suggestDriverPosition } = await import("@/lib/ai/driver-positioning");
            await suggestDriverPosition(user?.id ?? "");
          },
        },
      }),
    [user?.id],
  );
}

// ── Driver Earnings Card ──
export function useDriverEarningsCard(): CardContract<{ totalEarnings: number; currency: string }> {
  const { user } = useAuth();

  return useMemo(
    () =>
      buildCardContract({
        id: "driver_earnings",
        domain: "wallet",
        title: "Earnings",
        data: null,
        disabled: !user?.id,
        disabledReason: !user?.id ? "Not authenticated" : undefined,
        deepLink: "/driver/earnings",
        primaryAction: {
          label: "View Earnings",
          run: () => { window.location.href = "/driver/earnings"; },
        },
      }),
    [user?.id],
  );
}
