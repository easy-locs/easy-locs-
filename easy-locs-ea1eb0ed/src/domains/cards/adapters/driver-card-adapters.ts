/**
 * Card Adapters — Driver Surface
 * Real data from canonical sources: useDriverLive + getDriverEarnings.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { buildCardContract, type CardContract } from "../card-contract";
import { useAuth } from "@/contexts/AuthContext";
import { useDriverLive } from "@/hooks/useDriverLive";
import { getDriverEarnings, type DriverEarningsSummary } from "@/lib/driver/earnings";

// ── Driver Status Card — REAL data from useDriverLive ──
export function useDriverStatusCard(): CardContract<{
  isOnline: boolean;
  isAvailable: boolean;
  currentStatus: string;
}> {
  const { user } = useAuth();
  const { data: profile, error } = useDriverLive(user?.id ?? null);

  return useMemo(() => {
    const p = profile as { is_online?: boolean; is_available?: boolean; current_status?: string } | null | undefined;
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
            actionType: "mutation" as const,
            run: async () => {
              const { platformBus } = await import("@/lib/shared/platform-bus");
              platformBus.emit("driver:toggle_online", { driverId: user?.id }, "driverStatusCard");
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
          actionType: "orchestration" as const,
          run: async () => {
            const { suggestDriverPosition } = await import("@/lib/ai/driver-positioning");
            await suggestDriverPosition(user?.id ?? "");
          },
        },
      }),
    [user?.id],
  );
}

// ── Driver Earnings Card — REAL data from getDriverEarnings ──
export function useDriverEarningsCard(): CardContract<DriverEarningsSummary> {
  const { user } = useAuth();

  const { data: earnings, error, isLoading } = useQuery({
    queryKey: ["driver-earnings", user?.id],
    queryFn: () => getDriverEarnings(user?.id),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  return useMemo(
    () =>
      buildCardContract({
        id: "driver_earnings",
        domain: "wallet",
        title: "Earnings",
        data: earnings ?? null,
        error: error?.message,
        disabled: !user?.id,
        disabledReason: !user?.id ? "Not authenticated" : undefined,
        deepLink: "/driver/earnings",
        primaryAction: {
          label: "View Earnings",
          actionType: "navigation" as const,
          run: () => { window.location.href = "/driver/earnings"; },
        },
      }),
    [earnings, error, user?.id],
  );
}
