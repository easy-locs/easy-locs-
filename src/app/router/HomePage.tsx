import { AppPageShell } from "@/components/layout/AppPageShell";
import { AppMainNav } from "@/components/layout/AppMainNav";
import { useOrbitStore } from "@/stores/orbitStore";
import { useWalletStore } from "@/stores/walletStore";

export default function HomePage() {
  const orbit = useOrbitStore((s) => s.profile);
  const wallet = useWalletStore((s) => s.wallet);

  return (
    <AppPageShell
      title="V2 Home"
      actions={<AppMainNav />}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border p-4">
          <h3 className="text-lg font-semibold text-foreground">Orbit</h3>
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
