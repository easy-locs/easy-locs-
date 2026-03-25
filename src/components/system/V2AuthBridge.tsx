import { useEffect } from "react";
import { useV2AuthStore } from "@/stores/v2AuthStore";
import { useOrbitStore } from "@/stores/orbitStore";

/**
 * V2AuthBridge — NON-BLOCKING. Initializes auth and loads orbit profile
 * without blocking the render tree.
 */
export function V2AuthBridge({ children }: { children: React.ReactNode }) {
  const init = useV2AuthStore((s) => s.init);
  const user = useV2AuthStore((s) => s.user);
  const loadProfile = useOrbitStore((s) => s.loadProfile);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (user?.id) {
      void loadProfile(user.id);
    }
  }, [user?.id, loadProfile]);

  return <>{children}</>;
}
