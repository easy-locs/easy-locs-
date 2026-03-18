import { createWalletAccount } from "@/lib/wallet/wallet-core";
import { useWalletAccounts } from "@/hooks/useWalletAccounts";
import { useAuth } from "@/contexts/AuthContext";

export default function WalletHubPage() {
  const { user } = useAuth();
  const { rows, loading } = useWalletAccounts(user?.id);

  const createFiat = async () => {
    if (!user?.id) return;
    await createWalletAccount({ ownerUserId: user.id, ownerType: "user", currency: "AED", accountType: "fiat" });
  };

  const createCrypto = async () => {
    if (!user?.id) return;
    await createWalletAccount({ ownerUserId: user.id, ownerType: "user", currency: "USDT", accountType: "crypto" });
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Hybrid Wallet</h1>
        <p className="text-sm text-muted-foreground">Fiat + crypto + escrow + rewards</p>
      </div>

      <div className="flex gap-3">
        <button onClick={createFiat} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Create AED wallet</button>
        <button onClick={createCrypto} className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground">Create USDT wallet</button>
      </div>

      <div className="space-y-3">
        {loading && <p className="text-muted-foreground">Loading...</p>}
        {rows.map((row: any) => (
          <div key={row.id} className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground">{row.currency} · {row.account_type}</p>
            <p className="text-xs text-muted-foreground">balance {row.balance} / available {row.available_balance}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
