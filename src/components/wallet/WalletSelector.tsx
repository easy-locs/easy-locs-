/**
 * WalletSelector — pick a wallet account from the user's list.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Wallet } from "lucide-react";

interface WalletAccount {
  id: string;
  currency: string;
  balance: number;
  account_type: string;
  status: string;
}

interface WalletSelectorProps {
  userId: string;
  onSelect: (walletId: string) => void;
  selectedId?: string;
  label?: string;
}

export default function WalletSelector({
  userId,
  onSelect,
  selectedId,
  label = "Select wallet",
}: WalletSelectorProps) {
  const [wallets, setWallets] = useState<WalletAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    supabase
      .from("wallet_accounts")
      .select("id, currency, balance, account_type, status")
      .eq("owner_user_id", userId)
      .eq("status", "active")
      .then(({ data }) => {
        setWallets((data as WalletAccount[]) ?? []);
        setLoading(false);
      });
  }, [userId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading wallets…</p>;
  }

  if (!wallets.length) {
    return <p className="text-sm text-muted-foreground">No wallets found</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="grid gap-2">
        {wallets.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => onSelect(w.id)}
            className={`flex items-center gap-3 w-full border rounded-xl p-3 text-left transition-colors ${
              selectedId === w.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <Wallet className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {w.account_type.toUpperCase()} · {w.currency}
              </p>
              <p className="text-xs text-muted-foreground">
                Balance: {Number(w.balance).toFixed(2)} {w.currency}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
