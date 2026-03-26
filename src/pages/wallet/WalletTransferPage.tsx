/**
 * WalletTransferPage — Send balance to another user.
 * Supports ?to=, ?email=, ?orbitId= prefill.
 * Validates recipient wallet before allowing transfer.
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { walletTransfer, useWalletBalance } from "@/payments/wallet-hooks";
import { resolvePayTarget, type ResolvedPayTarget } from "@/lib/wallet/resolvePayTarget";
import { AppCard } from "@/components/ui/AppCard";
import { AppActionButton } from "@/components/ui/AppActionButton";
import { ArrowLeft, User, Search, AlertTriangle } from "lucide-react";

export default function WalletTransferPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { balance, currency, reload: reloadBalance, optimisticAdjust } = useWalletBalance();

  const [recipient, setRecipient] = useState(searchParams.get("to") || searchParams.get("email") || "");
  const [target, setTarget] = useState<ResolvedPayTarget | null>(null);
  const [amount, setAmount] = useState("25");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);

  // Auto-resolve prefilled params
  useEffect(() => {
    const to = searchParams.get("to");
    const email = searchParams.get("email");
    const orbitId = searchParams.get("orbitId");
    if (!to && !email && !orbitId) return;

    void (async () => {
      setSearching(true);
      try {
        const resolved = await resolvePayTarget({ userId: to ?? undefined, email: email ?? undefined, orbitId: orbitId ?? undefined });
        if (resolved) {
          setTarget(resolved);
          setRecipient(resolved.displayName || resolved.targetUserId);
        }
      } catch (e) {
        console.error("[WalletTransfer] prefill resolve failed", e);
      } finally {
        setSearching(false);
      }
    })();
  }, [searchParams]);

  const findRecipient = async () => {
    const trimmed = recipient.trim();
    if (!trimmed) { toast.error("Enter a user ID, email, or orbit ID"); return; }
    setSearching(true);

    try {
      const resolved = await resolvePayTarget({
        userId: trimmed.includes("@") || trimmed.startsWith("orbit_") ? undefined : trimmed,
        email: trimmed.includes("@") ? trimmed.toLowerCase() : undefined,
        orbitId: trimmed.startsWith("orbit_") ? trimmed : undefined,
      });
      if (resolved) {
        setTarget(resolved);
      } else {
        toast.error("Recipient not found");
      }
    } catch {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const walletWarning = target && target.walletStatus !== "active";

  const submit = async () => {
    if (!user?.id) { toast.error("Please sign in first"); return; }
    if (!target?.targetUserId) { toast.error("Find a recipient first"); return; }
    if (target.walletStatus === "missing") { toast.error("Recipient has no active wallet"); return; }
    if (target.walletStatus === "locked") { toast.error("Recipient wallet is locked"); return; }
    const numAmount = Number(amount ?? 0);
    if (!numAmount || numAmount <= 0) { toast.error("Enter a valid amount"); return; }
    if (numAmount > balance) { toast.error("Insufficient balance"); return; }
    if (target.targetUserId === user.id) { toast.error("Cannot send to yourself"); return; }

    optimisticAdjust(-numAmount);
    setSaving(true);

    try {
      await walletTransfer({
        senderId: user.id,
        recipientId: target.targetUserId,
        amount: numAmount,
        currency,
        contextType: "manual_transfer",
        title: note.trim() || "Transfer",
      });
      await reloadBalance();
      toast.success("Transfer completed");
      navigate("/wallet/hub");
    } catch (err: any) {
      optimisticAdjust(numAmount);
      toast.error(err.message || "Transfer failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-mobile-page app-mobile-content bg-background">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("/wallet/hub")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-[0.95] transition-transform">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Transfer</h1>
          <p className="text-xs text-muted-foreground">Send balance to another user</p>
        </div>
      </div>

      {/* Live balance chip */}
      <div className="px-4 mb-4">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-foreground">
          <span className="text-muted-foreground">Balance</span>
          <span>{balance.toFixed(2)} {currency}</span>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Recipient search */}
        <div className="flex gap-2">
          <input
            value={recipient}
            onChange={(e) => { setRecipient(e.target.value); setTarget(null); }}
            placeholder="User ID, email, or orbit ID"
            className="flex-1 rounded-xl border border-border/20 bg-card px-3 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
          />
          <AppActionButton variant="secondary" onClick={findRecipient} loading={searching}>
            <Search className="h-4 w-4" />
          </AppActionButton>
        </div>

        {/* Resolved target card */}
        {target && (
          <AppCard variant="elevated" padding="sm" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              {target.avatarUrl ? (
                <img src={target.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground truncate">{target.displayName || "Unknown"}</p>
              <p className="text-[11px] text-muted-foreground truncate">{target.targetUserId}</p>
            </div>
          </AppCard>
        )}

        {/* Wallet status warning */}
        {walletWarning && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-xs text-destructive font-medium">
              {target!.walletStatus === "locked"
                ? "Recipient's wallet is locked"
                : "Recipient has no active wallet — transfer will fail"}
            </p>
          </div>
        )}

        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="w-full rounded-xl border border-border/20 bg-card px-3 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20" />
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Note (optional)" className="w-full rounded-xl border border-border/20 bg-card px-3 py-3 text-sm text-foreground resize-none outline-none focus:ring-2 focus:ring-primary/20" />

        <AppActionButton full onClick={submit} loading={saving} disabled={!target || !!walletWarning}>
          {saving ? "Sending…" : "Send Transfer"}
        </AppActionButton>
      </div>
    </div>
  );
}
