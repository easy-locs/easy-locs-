import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { invalidateIdentityCache } from "@/lib/canonical-identity";
import { useOrbitProfileStore } from "@/stores/orbit-profile.store";
import { ensureOrbitProfile } from "@/lib/orbit/ensureOrbitProfile";
import { ensureWalletAccount } from "@/lib/wallet/ensureWalletAccount";
import { ensureWalletBinding } from "@/lib/wallet/wallet-identity-binding";
import { getDeviceFingerprint } from "@/lib/orbit-keystore";
import { useWalletStore } from "@/stores/walletStore";
import { useFavoritesStore } from "@/stores/favoritesStore";
import { useSavedSearchStore } from "@/stores/savedSearchStore";
import { useNotificationStore } from "@/stores/notification.store";
import { startContinuousGuard } from "@/lib/runtime/architecture-guard";
import { generateExecutionProof } from "@/lib/runtime/execution-proof";
import { useAutoEngineCron } from "@/hooks/useAutoEngineCron";
import { PresencePipeline } from "@/families/presence";
import { logger } from "@/lib/monitoring";
import { registerCanonicalResolutions } from "@/lib/canonical-resolution-guard";

/**
 * AppInit — initializes auth store, hydrates orbit profile, wallet, favorites and saved searches.
 * Wallet loads in parallel with Orbit (not sequential).
 */
export function AppInit() {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const loadProfile = useOrbitProfileStore((s) => s.loadProfile);
  const clear = useOrbitProfileStore((s) => s.clear);

  useAutoEngineCron();

  useEffect(() => {
    const ric = (cb: () => void) => requestIdleCallback(cb);
    ric(() => startContinuousGuard());
    ric(() => {
      try { generateExecutionProof(); } catch (e) { logger.warn("AppInit", "Execution proof generation failed", { error: e instanceof Error ? e.message : String(e) }); }
    });
    ric(() => { void registerCanonicalResolutions(); });
  }, []);

  useEffect(() => {
    if (!initialized) return;
    invalidateIdentityCache();

    if (!user) {
      clear();
      PresencePipeline.disconnect();
      useWalletStore.setState({ wallet: null, transactions: [], loading: false });
      useFavoritesStore.setState({ items: [], loading: false });
      useSavedSearchStore.setState({ items: [], loading: false });
      useNotificationStore.getState().clear();
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
    }).catch((e) => logger.error("AppInit", "Wallet setup failed — user may have degraded wallet experience", { error: e instanceof Error ? e.message : String(e), userId: user.id }));

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
      } catch (e) { logger.error("AppInit", "Profile/Orbit setup failed — messaging may be unavailable", { error: e instanceof Error ? e.message : String(e), userId: user.id }); }
    })();
  }, [initialized, user?.id, loadProfile, clear]);

  return null;
}
