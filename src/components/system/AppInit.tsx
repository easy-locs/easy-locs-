import { useEffect } from "react";
import { useV2AuthStore } from "@/stores/v2AuthStore";
import { useOrbitStore } from "@/stores/orbitStore";
import { useWalletStore } from "@/stores/walletStore";

/**
 * AppInit — initializes V2 auth, hydrates orbit profile and wallet.
 * Mount once at the top of the app tree.
 */
export function AppInit() {
  const init = useV2AuthStore((s) => s.init);
  const user = useV2AuthStore((s) => s.user);
  const initialized = useV2AuthStore((s) => s.initialized);
  const loadProfile = useOrbitStore((s) => s.loadProfile);
  const clear = useOrbitStore((s) => s.clear);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (!initialized) return;

    if (!user) {
      clear();
      useWalletStore.setState({ wallet: null, transactions: [], loading: false });
      return;
    }

    void (async () => {
      await loadProfile(user.id);
      const orbit = useOrbitStore.getState().profile;
      if (!orbit) return;

      await useWalletStore.getState().loadWallet({
        walletId: `wallet_${orbit.orbitId}`,
        ownerOrbitId: orbit.orbitId,
        currency: "AED",
      });
    })();
  }, [initialized, user?.id, loadProfile, clear]);

  return null;
}
