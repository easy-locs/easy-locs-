import { useEffect } from "react";
import { useAppHydrationStore } from "@/stores/appHydrationStore";

/**
 * AppHydrationGate — NON-BLOCKING. Renders children immediately.
 * Hydration runs in background without blocking the UI.
 */
export function AppHydrationGate(props: {
  children: React.ReactNode;
}) {
  const hydrateApp = useAppHydrationStore((s) => s.hydrateApp);

  useEffect(() => {
    void hydrateApp();
  }, [hydrateApp]);

  return <>{props.children}</>;
}
