import { useEffect } from "react";
import { installPlatformReactions } from "@/core/bootstrap/install-platform-reactions";
import { useOrbitStore } from "@/stores/orbitStore";

type Props = {
  children: React.ReactNode;
};

export function AppBootstrap({ children }: Props) {
  useEffect(() => {
    installPlatformReactions();
  }, []);

  return <>{children}</>;
}
