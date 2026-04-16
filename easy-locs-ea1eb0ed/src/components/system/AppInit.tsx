import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { invalidateIdentityCache } from "@/lib/canonical-identity";
import { useGeoSync } from "@/stores/locationStore";
import { getOrbitIdentity, loadOrbitProfile, clearOrbitProfile } from "@/hooks/useOrbitIdentity";
import { ensureOrbitProfile } from "@/lib/orbit/ensureOrbitProfile";
import { ensureWalletAccount } from "@/lib/wallet/ensureWalletAccount";
import { ensureWalletBinding } from "@/lib/wallet/wallet-identity-binding";
import { getDeviceFingerprint } from "@/lib/orbit-keystore";
import { useWalletStore } from "@/stores/walletStore";
import { useFavoritesStore } from "@/stores/favoritesStore";
import { useSavedSearchStore } from "@/stores/savedSearchStore";
import { useNotificationStore } from "@/stores/notification.store";
import { startContinuousGuard } from "@/lib/runtime/architecture-guard";
import { initRuntimeStability } from "@/lib/runtime/stability-init";
import { generateExecutionProof } from "@/lib/runtime/execution-proof";
import { startEvolutionEngine } from "@/lib/runtime/evolution-engine";
import { useAutoEngineCron } from "@/hooks/useAutoEngineCron";
import { PresencePipeline } from "@/families/presence";
import { logger } from "@/lib/monitoring";
import { registerCanonicalResolutions } from "@/lib/canonical-resolution-guard";
import { workflowExecutor } from "@/lib/automation/workflow-executor";
import { keyboardManager } from "@/lib/platform/keyboard-manager";
import { statusBarController } from "@/lib/platform/status-bar-controller";
import { platformCapabilities } from "@/lib/platform/platform-capability-layer";

export function AppInit() {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

  useAutoEngineCron();
  useGeoSync();

  useEffect(() => {
    const ric = (cb: () => void) => requestIdleCallback(cb);
    ric(() => initRuntimeStability());
    ric(() => startContinuousGuard());
    ric(() => startEvolutionEngine());
    ric(() => {
      try { generateExecutionProof(); } catch (e) { logger.warn("AppInit", "Execution proof generation failed", { error: e instanceof Error ? e.message : String(e) }); }
    });
    ric(() => { void registerCanonicalResolutions(); });
    ric(() => { workflowExecutor.start(); });

    ric(() => {
      void keyboardManager.init();
      void statusBarController.init();
      platformCapabilities.probeAll();
      void platformCapabilities.hideSplashScreen();
    });
  }, []);

  useEffect(() => {
    if (!initialized) return;
    invalidateIdentityCache();

    if (!user) {
      clearOrbitProfile();
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
        await loadOrbitProfile(user.id);

        const identity = getOrbitIdentity();
        const displayName = identity?.displayName || user.user_metadata?.full_name || `EL-${user.id.replace(/-/g, "").substring(0, 8).toUpperCase()}`;
        PresencePipeline.connect(user.id, displayName);

        await Promise.all([
          useFavoritesStore.getState().hydrate(),
          useSavedSearchStore.getState().hydrate(),
        ]);
      } catch (e) { logger.error("AppInit", "Profile/Orbit setup failed — messaging may be unavailable", { error: e instanceof Error ? e.message : String(e), userId: user.id }); }
    })();
  }, [initialized, user?.id]);

  return null;
}
