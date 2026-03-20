import { useEffect } from "react";
import { installPlatformReactions } from "@/core/bootstrap/install-platform-reactions";
import { useOrbitStore } from "@/stores/orbitStore";

type Props = {
  children: React.ReactNode;
};

export function AppBootstrap({ children }: Props) {
  useEffect(() => {
    installPlatformReactions();

    void useOrbitStore.getState().loadOrbitProfile({
      userId: "demo_user_1",
      orbitId: "orbit_demo_1",
      role: "seller",
    });
  }, []);

  return <>{children}</>;
}
