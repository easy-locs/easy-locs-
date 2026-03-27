import { useCanonicalAppHealth } from "@/hooks/useCanonicalAppHealth";

export function AppHealthBanner() {
  const { globalAppHealth, appHealth } = useCanonicalAppHealth();

  if (globalAppHealth === "ok") return null;

  return (
    <div className="w-full bg-destructive/10 border-b border-destructive/20 px-4 py-2">
      <div className="max-w-4xl mx-auto space-y-1">
        <p className="text-sm font-semibold text-destructive">
          {globalAppHealth === "down"
            ? "System issue detected"
            : "Partial degradation detected"}
        </p>
        <p className="text-xs text-muted-foreground">
          Orbit: {appHealth.orbit} · Wallet: {appHealth.wallet} · Radar:{" "}
          {appHealth.radar} · Dashboard: {appHealth.dashboard} · Me:{" "}
          {appHealth.me} · Notifications: {appHealth.notifications}
        </p>
      </div>
    </div>
  );
}
