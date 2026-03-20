import { useEffect } from "react";
import { useAppHydrationStore } from "@/stores/appHydrationStore";

export function AppHydrationGate(props: {
  children: React.ReactNode;
}) {
  const hydrateApp = useAppHydrationStore((s) => s.hydrateApp);
  const hydrated = useAppHydrationStore((s) => s.hydrated);
  const hydrating = useAppHydrationStore((s) => s.hydrating);

  useEffect(() => {
    void hydrateApp();
  }, [hydrateApp]);

  if (!hydrated || hydrating) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading app...</p>
      </div>
    );
  }

  return <>{props.children}</>;
}
