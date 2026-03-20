import { useEffect } from "react";
import { AppPageShell } from "@/components/layout/AppPageShell";
import { AppMainNav } from "@/components/layout/AppMainNav";
import { useOrbitStore } from "@/stores/orbitStore";
import { useWalletStore } from "@/stores/walletStore";
import { useV2AuthStore } from "@/stores/v2AuthStore";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { ActivityPanel } from "@/components/system/ActivityPanel";
import { useActivityLogStore } from "@/stores/activityLogStore";
import { PushSettingsPanel } from "@/components/settings/PushSettingsPanel";
import { useActivityRealtime } from "@/hooks/useActivityRealtime";

export default function HomePage() {
  const orbit = useOrbitStore((s) => s.profile);
  const wallet = useWalletStore((s) => s.wallet);
  const user = useV2AuthStore((s) => s.user);
  const signOut = useV2AuthStore((s) => s.signOut);
  const hydrateActivity = useActivityLogStore((s) => s.hydrate);

  useActivityRealtime();

  useEffect(() => {
    void hydrateActivity();
  }, [hydrateActivity]);

  return (
    <AppPageShell
      title="V2 Home"
      actions={
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <button
            onClick={() => void signOut()}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      }
    >
      <AppMainNav />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <div className="rounded-lg border border-border p-4">
          <h3 className="text-lg font-semibold text-foreground">Orbit Profile</h3>
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap mt-2">
            {JSON.stringify(orbit, null, 2)}
          </pre>
        </div>

        <div className="rounded-lg border border-border p-4">
          <h3 className="text-lg font-semibold text-foreground">Wallet</h3>
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap mt-2">
            {JSON.stringify(wallet, null, 2)}
          </pre>
        </div>

        <div className="rounded-lg border border-border p-4">
          <AvatarUploader />
        </div>

        <ActivityPanel />
        <PushSettingsPanel />
      </div>
    </AppPageShell>
  );
}
