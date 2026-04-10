import { useEffect } from "react";
import { useV2AuthStore } from "@/stores/v2AuthStore";
import { invalidateIdentityCache } from "@/lib/canonical-identity";
import { useOrbitProfileStore } from "@/stores/orbitStore";
import { ensureOrbitProfile } from "@/lib/orbit/ensureOrbitProfile";
import { ensureWalletAccount } from "@/lib/wallet/ensureWalletAccount";
import { ensureWalletBinding } from "@/lib/wallet/wallet-identity-binding";
import { getDeviceFingerprint } from "@/lib/orbit-keystore";
import { useWalletStore } from "@/stores/walletStore";
import { useFavoritesStore } from "@/stores/favoritesStore";
import { useSavedSearchStore } from "@/stores/savedSearchStore";
import { useNotificationV2Store } from "@/stores/notificationV2Store";
import { startContinuousGuard } from "@/lib/runtime/architecture-guard";
import { generateExecutionProof } from "@/lib/runtime/execution-proof";
import { useAutoEngineCron } from "@/hooks/useAutoEngineCron";
import { PresencePipeline } from "@/families/presence";

/**
 * AppInit — initializes V2 auth, hydrates orbit profile, wallet, favorites and saved searches.
 * Wallet loads in parallel with Orbit (not sequential).
 */
export function AppInit() {
  const init = useV2AuthStore((s) => s.init);
  const user = useV2AuthStore((s) => s.user);
  const initialized = useV2AuthStore((s) => s.initialized);
  const loadProfile = useOrbitProfileStore((s) => s.loadProfile);
  const clear = useOrbitProfileStore((s) => s.clear);

  useAutoEngineCron();

  useEffect(() => {
    void init();
    const ric = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 2000));
    ric(() => startContinuousGuard());
    ric(() => {
      try { generateExecutionProof(); } catch (e) { console.warn("[AppInit] execution proof:", e); }
    });
  }, [init]);

  useEffect(() => {
    if (!initialized) return;
    // Invalidate canonical identity cache on any auth state change
    invalidateIdentityCache();

    if (!user) {
      clear();
      PresencePipeline.disconnect();
      useWalletStore.setState({ wallet: null, transactions: [], loading: false });
      useFavoritesStore.setState({ items: [], loading: false });
      useSavedSearchStore.setState({ items: [], loading: false });
      useNotificationV2Store.getState().clear();
      import("@/lib/wallet/wallet-identity-binding").then((m) => m.clearWalletBinding());
      return;
    }

    const syntheticWalletId = `wallet_${user.id.slice(0, 12)}`;
    void ensureWalletAccount(user.id).then(async () => {
      const deviceId = await getDeviceFingerprint();
      await ensureWalletBinding(user.id, deviceId, syntheticWalletId);
      void useWalletStore.getState().loadWallet({
        walletId: syntheticWalletId,
        ownerOrbitId: user.id,
        currency: "AED",
      });
    }).catch((e) => console.warn("[AppInit] wallet setup:", e));

    void (async () => {
      try {
        await ensureOrbitProfile();
        await loadProfile(user.id);

        const profile = useOrbitProfileStore.getState().profile;
        const displayName = profile?.displayName || user.user_metadata?.full_name || `EL-${user.id.replace(/-/g, "").substring(0, 8).toUpperCase()}`;
        PresencePipeline.connect(user.id, displayName);

        await Promise.all([
          useFavoritesStore.getState().hydrate(),
          useSavedSearchStore.getState().hydrate(),
        ]);
      } catch (e) { console.warn("[AppInit] profile/orbit setup:", e); }
    })();
  }, [initialized, user?.id, loadProfile, clear]);

  return null;
}
