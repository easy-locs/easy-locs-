import { AppPageShell } from "@/components/layout/AppPageShell";
import { AppMainNav } from "@/components/layout/AppMainNav";
import { useOrbitStore } from "@/stores/orbitStore";
import { useWalletStore } from "@/stores/walletStore";
import { useV2AuthStore } from "@/stores/v2AuthStore";

export default function HomePage() {
  const orbit = useOrbitStore((s) => s.profile);
  const wallet = useWalletStore((s) => s.wallet);
  const user = useV2AuthStore((s) => s.user);
  const signOut = useV2AuthStore((s) => s.signOut);

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
      </div>
    </AppPageShell>
  );
}
