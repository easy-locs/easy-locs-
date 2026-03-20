import { useEffect } from "react";
import { useV2AuthStore } from "@/stores/v2AuthStore";
import { useOrbitStore } from "@/stores/orbitStore";

/**
 * V2AuthBridge — initializes V2 auth and loads orbit profile.
 * Place at the top of V2 route trees.
 */
export function V2AuthBridge({ children }: { children: React.ReactNode }) {
  const init = useV2AuthStore((s) => s.init);
  const user = useV2AuthStore((s) => s.user);
  const loading = useV2AuthStore((s) => s.loading);
  const loadProfile = useOrbitStore((s) => s.loadProfile);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (user?.id) {
      void loadProfile(user.id);
    }
  }, [user?.id, loadProfile]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <p className="text-muted-foreground animate-pulse">Initializing...</p>
      </div>
    );
  }

  return <>{children}</>;
}
