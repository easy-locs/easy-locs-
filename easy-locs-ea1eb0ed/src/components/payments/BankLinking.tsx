import { useState, useEffect, useCallback } from "react";
import { Building2, Plus, Trash2, ArrowUpRight, RefreshCw, Loader2, CheckCircle2, CreditCard, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import {
  createLinkToken,
  exchangePublicToken,
  getLinkedAccounts,
  unlinkAccount,
  initiateAchTransfer,
  type LinkedBankAccount,
} from "@/services/plaid.service";
import { formatMoney } from "@/lib/format";

interface BankLinkingProps {
  onTopUpSuccess?: (amount: number) => void;
}

export default function BankLinking({ onTopUpSuccess }: BankLinkingProps) {
  const { t } = useI18n();
  const [accounts, setAccounts] = useState<LinkedBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [transferring, setTransferring] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getLinkedAccounts();
      setAccounts(result.accounts);
      if (result.errors.length > 0) {
        const errorSummary = result.errors.map(e => e.error).join(", ");
        console.warn("[BankLinking] Some accounts failed to load:", errorSummary);
        if (result.accounts.length === 0 && result.errors.length > 0 && result.errors[0].itemId !== "auth") {
          toast.error("Some bank accounts could not be loaded. Please try again.");
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleLinkBank = async () => {
    setLinking(true);
    try {
      const tokenRes = await createLinkToken();

      if (typeof window !== "undefined" && (window as any).Plaid) {
        const handler = (window as any).Plaid.create({
          token: tokenRes.linkToken,
          onSuccess: async (publicToken: string, metadata: any) => {
            const result = await exchangePublicToken(
              publicToken,
              metadata?.institution?.name || "Bank",
            );
            if (result.ok) {
              toast.success(t("bank.linked") || "Bank account linked");
              loadAccounts();
            } else {
              toast.error(result.error || "Failed to link account");
            }
          },
          onExit: () => setLinking(false),
        });
        handler.open();
      } else {
        toast.error("Plaid Link SDK is not loaded. Please reload the page and try again.");
      }
    } catch (err) {
      toast.error("Failed to initialize bank linking");
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (itemId: string) => {
    const result = await unlinkAccount(itemId);
    if (result.ok) {
      toast.success(t("bank.unlinked") || "Account removed");
      loadAccounts();
    }
  };

  const handleTopUp = async () => {
    if (!selectedAccount || !topUpAmount) return;
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) return;

    const account = accounts.find((a) => a.id === selectedAccount);
    if (!account) return;

    setTransferring(selectedAccount);
    try {
      const result = await initiateAchTransfer(account.plaidAccountId, amount, "USD", account.itemId);
      if (result.ok) {
        toast.success(`${formatMoney(amount, "USD")} transferred to wallet`);
        onTopUpSuccess?.(amount);
        setTopUpAmount("");
        loadAccounts();
      } else {
        toast.error(result.error || "Transfer failed");
      }
    } finally {
      setTransferring(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          {t("bank.title") || "Bank Accounts"}
        </h3>
        <button
          onClick={handleLinkBank}
          disabled={linking}
          className="flex items-center gap-1.5 text-xs font-medium text-primary px-3 py-1.5 rounded-lg bg-primary/10 active:scale-95 transition-all disabled:opacity-50"
        >
          {linking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          {t("bank.link_account") || "Link Account"}
        </button>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <Building2 className="h-8 w-8 mx-auto text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{t("bank.no_accounts") || "No linked bank accounts"}</p>
          <p className="text-xs text-muted-foreground/70">{t("bank.connect_desc") || "Connect a bank for instant ACH top-up"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {accounts.map((account) => (
            <div
              key={account.id}
              onClick={() => setSelectedAccount(selectedAccount === account.id ? null : account.id)}
              className={`rounded-xl border p-3 transition-all cursor-pointer ${
                selectedAccount === account.id
                  ? "border-primary/40 bg-primary/5"
                  : "border-border/20 bg-card/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted/40 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {account.institutionName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {account.accountName} ****{account.accountMask}
                  </p>
                </div>
                <div className="text-end">
                  <p className="text-sm font-bold text-foreground">
                    {formatMoney(account.balance, account.currency)}
                  </p>
                  <p className="text-[0.625rem] text-muted-foreground capitalize">{account.accountType}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleUnlink(account.itemId); }}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {selectedAccount === account.id && (
                <div className="mt-3 pt-3 border-t border-border/20 flex items-center gap-2">
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="number"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border border-border/30 bg-background text-foreground"
                    />
                  </div>
                  <button
                    onClick={handleTopUp}
                    disabled={!topUpAmount || transferring === account.id}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground active:scale-95 transition-all disabled:opacity-50"
                  >
                    {transferring === account.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    )}
                    {t("wallet.top_up") || "Top Up"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
