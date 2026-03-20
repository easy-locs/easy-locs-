import { useV2AuthStore } from "@/stores/v2AuthStore";

export function AuthGate(props: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const loading = useV2AuthStore((s) => s.loading);
  const initialized = useV2AuthStore((s) => s.initialized);
  const user = useV2AuthStore((s) => s.user);

  if (!initialized || loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <p className="text-muted-foreground animate-pulse">Loading session...</p>
      </div>
    );
  }

  if (!user) {
    return <>{props.fallback ?? (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Login required</p>
      </div>
    )}</>;
  }

  return <>{props.children}</>;
}
