/**
 * useCanonicalAddress — Hook for the canonical address pipeline.
 * Provides active context, saved addresses, resolution, and activation.
 */
import { useState, useEffect, useCallback } from "react";
import { useV2AuthStore } from "@/stores/v2AuthStore";
import {
  getActiveAddressContext,
  getUserSavedAddresses,
  resolveAndActivate,
  saveUserAddress,
  deleteUserAddress,
  type ActiveAddressContext,
  type UserSavedAddress,
  type ResolvedAddress,
} from "@/lib/address/canonical-address-resolver";
import type { CanonicalPlace } from "@/lib/address/canonical-place";
import { supabase } from "@/integrations/supabase/client";

interface UseCanonicalAddressResult {
  activeContext: ActiveAddressContext | null;
  savedAddresses: UserSavedAddress[];
  loading: boolean;
  /** Resolve a place and set it as the active address */
  activateAddress: (place: CanonicalPlace, source?: "gps" | "saved" | "manual" | "recent", contextType?: string) => Promise<ResolvedAddress | null>;
  /** Save an address to user's saved list */
  saveAddress: (canonicalPlaceId: string, label?: string, opts?: { apartment?: string; floor?: string; deliveryNote?: string; isDefault?: boolean }) => Promise<void>;
  /** Delete a saved address */
  removeSavedAddress: (addressId: string) => Promise<void>;
  /** Refresh data */
  refresh: () => Promise<void>;
}

export function useCanonicalAddress(): UseCanonicalAddressResult {
  const userId = useV2AuthStore((s) => s.user?.id);
  const [activeContext, setActiveContext] = useState<ActiveAddressContext | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<UserSavedAddress[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [ctx, saved] = await Promise.all([
      getActiveAddressContext(userId),
      getUserSavedAddresses(userId),
    ]);
    setActiveContext(ctx);
    setSavedAddresses(saved);
    setLoading(false);
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Realtime subscription on active context
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`addr-ctx-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_active_address_context", filter: `user_id=eq.${userId}` }, () => {
        refresh();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, refresh]);

  const activateAddress = useCallback(async (
    place: CanonicalPlace,
    source: "gps" | "saved" | "manual" | "recent" = "manual",
    contextType?: string,
  ): Promise<ResolvedAddress | null> => {
    if (!userId) return null;
    try {
      const resolved = await resolveAndActivate({ userId, place, source, contextType });
      await refresh();
      return resolved;
    } catch (e) {
      console.error("[useCanonicalAddress] activate failed:", e);
      return null;
    }
  }, [userId, refresh]);

  const saveAddressFn = useCallback(async (
    canonicalPlaceId: string,
    label?: string,
    opts?: { apartment?: string; floor?: string; deliveryNote?: string; isDefault?: boolean },
  ) => {
    if (!userId) return;
    await saveUserAddress({
      userId,
      canonicalPlaceId,
      label,
      apartment: opts?.apartment,
      floor: opts?.floor,
      deliveryNote: opts?.deliveryNote,
      isDefault: opts?.isDefault,
    });
    await refresh();
  }, [userId, refresh]);

  const removeSavedAddress = useCallback(async (addressId: string) => {
    await deleteUserAddress(addressId);
    await refresh();
  }, [refresh]);

  return {
    activeContext,
    savedAddresses,
    loading,
    activateAddress,
    saveAddress: saveAddressFn,
    removeSavedAddress,
    refresh,
  };
}
