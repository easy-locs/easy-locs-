import { useEffect } from "react";
import { useV2AuthStore } from "@/stores/v2AuthStore";
import { useOrbitStore } from "@/stores/orbitStore";
import { ensureOrbitProfile } from "@/lib/orbit/ensureOrbitProfile";
import { ensureWalletAccount } from "@/lib/wallet/ensureWalletAccount";
import { useWalletStore } from "@/stores/walletStore";
import { useFavoritesStore } from "@/stores/favoritesStore";
import { useSavedSearchStore } from "@/stores/savedSearchStore";

/**
 * AppInit — initializes V2 auth, hydrates orbit profile, wallet, favorites and saved searches.
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
      useFavoritesStore.setState({ items: [], loading: false });
      useSavedSearchStore.setState({ items: [], loading: false });
      return;
    }

    void (async () => {
      await ensureOrbitProfile();
      await ensureWalletAccount(user.id);
      await loadProfile(user.id);
      const orbit = useOrbitStore.getState().profile;
      if (!orbit) return;

      await useWalletStore.getState().loadWallet({
        walletId: `wallet_${orbit.orbitId}`,
        ownerOrbitId: user.id,
        currency: "AED",
      });

      await Promise.all([
        useFavoritesStore.getState().hydrate(),
        useSavedSearchStore.getState().hydrate(),
      ]);
    })();
  }, [initialized, user?.id, loadProfile, clear]);

  return null;
}
