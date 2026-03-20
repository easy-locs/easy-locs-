import { useEffect } from "react";
import { useV2AuthStore } from "@/stores/v2AuthStore";
import { useOrbitStore } from "@/stores/orbitStore";

/**
 * AppInit — initializes V2 auth and hydrates orbit profile.
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
      return;
    }
    void loadProfile(user.id);
  }, [initialized, user?.id, loadProfile, clear]);

  return null;
}
