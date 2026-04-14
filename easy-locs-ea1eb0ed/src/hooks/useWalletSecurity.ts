import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import * as paymentsRepo from "@/repositories/payments.repository";
import { getStoredBinding, ensureWalletBinding } from "@/lib/wallet/wallet-identity-binding";
import { guardWalletReady } from "@/lib/wallet/wallet-guard";
import { getDeviceFingerprint } from "@/lib/orbit-keystore";
import { DAILY_TRANSFER_LIMITS } from "@/lib/wallet-limits";
import { db } from "@/services/db";
import { toast } from "sonner";

export interface WalletSecurityState {
  pinStatus: "loading" | "set" | "not_set";
  deviceBound: boolean;
  bindingInProgress: boolean;
  dailyLimit: number;
  dailyLimitLoaded: boolean;
  refreshPinStatus: () => Promise<void>;
  handleBindDevice: () => Promise<void>;
}

export function useWalletSecurity(): WalletSecurityState {
  const { user } = useAuth();
  const [pinStatus, setPinStatus] = useState<"loading" | "set" | "not_set">("loading");
  const [deviceBound, setDeviceBound] = useState(false);
  const [bindingInProgress, setBindingInProgress] = useState(false);
  const [dailyLimit, setDailyLimit] = useState(DAILY_TRANSFER_LIMITS.default);
  const [dailyLimitLoaded, setDailyLimitLoaded] = useState(false);

  const refreshPinStatus = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await paymentsRepo.invokeWalletPin({ action: "check_status" });
      setPinStatus(data?.has_pin ? "set" : "not_set");
    } catch {
      setPinStatus("not_set");
    }
  }, [user?.id]);

  const handleBindDevice = useCallback(async () => {
    if (!user?.id) return;
    setBindingInProgress(true);
    try {
      const guard = await guardWalletReady(user.id);
      if (!guard.valid || !guard.walletId) {
        toast.error(guard.error || "Wallet not ready");
        return;
      }
      const deviceId = await getDeviceFingerprint();
      await ensureWalletBinding(user.id, deviceId, guard.walletId);
      setDeviceBound(true);
      toast.success("Device bound successfully");
    } catch {
      toast.error("Failed to bind device");
    } finally {
      setBindingInProgress(false);
    }
  }, [user?.id]);

  useEffect(() => { refreshPinStatus(); }, [refreshPinStatus]);

  useEffect(() => {
    const binding = getStoredBinding();
    setDeviceBound(!!binding && binding.userId === user?.id);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const { data } = await db
          .from("profiles" as any)
          .select("daily_transfer_limit")
          .eq("id", user.id)
          .single();
        if (data?.daily_transfer_limit) {
          setDailyLimit(data.daily_transfer_limit);
        }
      } catch {}
      setDailyLimitLoaded(true);
    })();
  }, [user?.id]);

  return {
    pinStatus,
    deviceBound,
    bindingInProgress,
    dailyLimit,
    dailyLimitLoaded,
    refreshPinStatus,
    handleBindDevice,
  };
}
