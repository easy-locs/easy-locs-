/**
 * PaymentConfirmPage — End-to-end payment confirmation.
 * Resolves target from URL params, validates wallet, confirms transfer.
 */
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, User, Loader2, AlertTriangle } from "lucide-react";
import { AppCard } from "@/components/ui/AppCard";
import { AppActionButton } from "@/components/ui/AppActionButton";
import { resolvePayTarget, type ResolvedPayTarget } from "@/lib/wallet/resolvePayTarget";
import { walletTransfer } from "@/payments/wallet-hooks";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { PremiumPaymentSuccess } from "@/components/pay/PremiumPaymentSuccess";
import { playPremiumSuccessBeep, hapticPremiumSuccess } from "@/lib/scan/feedback";

export default function PaymentConfirmPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [target, setTarget] = useState<ResolvedPayTarget | null>(null);
  const [amount, setAmount] = useState(params.get("amount") ?? "");
  const [currency] = useState(params.get("currency") ?? "AED");
  const [note, setNote] = useState(params.get("note") ?? "");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [showPremiumSuccess, setShowPremiumSuccess] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const resolved = await resolvePayTarget({
          userId: params.get("userId") ?? undefined,
          orbitId: params.get("orbitId") ?? undefined,
          email: params.get("email") ?? undefined,
        });
        setTarget(resolved);
      } catch (e) {
        console.error("[PayConfirm] resolve failed", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [params]);

  const confirm = async () => {
    if (!target?.targetUserId || !user?.id) return;
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) { toast.error("Enter a valid amount"); return; }
    if (target.targetUserId === user.id) { toast.error("Cannot pay yourself"); return; }
    if (target.walletStatus === "missing") { toast.error("Recipient has no active wallet"); return; }
    if (target.walletStatus === "locked") { toast.error("Recipient wallet is locked"); return; }

    setSending(true);
    try {
      await walletTransfer({
        senderId: user.id,
        recipientId: target.targetUserId,
        amount: numAmount,
        currency,
        contextType: "qr_payment",
        title: note.trim() || `Pay ${target.displayName || "user"}`,
      });
      playPremiumSuccessBeep();
      hapticPremiumSuccess();
      setShowPremiumSuccess(true);
      toast.success("Payment sent!");
      setTimeout(() => {
        setShowPremiumSuccess(false);
        setSent(true);
        navigate("/wallet/hub", { replace: true });
      }, 1800);
    } catch (err: any) {
      toast.error(err.message || "Payment failed");
    } finally {
      setSending(false);
    }
  };

  const walletWarning = target && target.walletStatus !== "active";

  return (
    <div className="app-mobile-page bg-background pb-24 relative">
      <PremiumPaymentSuccess
        open={showPremiumSuccess}
        logoUrl="/easylocs-logo.png"
        amount={`${amount} ${currency}`}
      />
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-[0.95] transition-transform"
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Confirm Payment</h1>
      </div>

      <div className="px-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : sent ? (
          <AppCard variant="elevated" padding="lg" className="flex flex-col items-center gap-3 py-8">
            <CheckCircle2 className="h-14 w-14 text-primary" />
            <p className="text-lg font-bold text-foreground">Payment Sent</p>
            <p className="text-sm text-muted-foreground">{amount} {currency} to {target?.displayName || "user"}</p>
          </AppCard>
        ) : !target ? (
          <AppCard variant="base" padding="lg" className="text-center py-8">
            <User className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm font-semibold text-foreground">Recipient not found</p>
            <p className="text-xs text-muted-foreground mt-1">Check the ID, email, or link and try again</p>
          </AppCard>
        ) : (
          <>
            {/* Recipient card */}
            <AppCard variant="elevated" padding="md" className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {target.avatarUrl ? (
                  <img src={target.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground truncate">{target.displayName || "Unknown"}</p>
                <p className="text-xs text-muted-foreground truncate">{target.targetUserId}</p>
              </div>
            </AppCard>

            {/* Wallet status warning */}
            {walletWarning && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-xs text-destructive font-medium">
                  {target.walletStatus === "locked"
                    ? "Recipient's wallet is locked"
                    : "Recipient has no active wallet"}
                </p>
              </div>
            )}

            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Amount ({currency})</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-border/20 bg-card px-3 py-3 text-2xl font-bold text-foreground text-center outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Note (optional)</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What's this for?"
                className="w-full rounded-xl border border-border/20 bg-card px-3 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <AppActionButton
              full
              loading={sending}
              onClick={confirm}
              disabled={!amount || Number(amount) <= 0 || !!walletWarning}
            >
              {sending ? "Sending…" : `Pay ${amount || "0"} ${currency}`}
            </AppActionButton>
          </>
        )}
      </div>
    </div>
  );
}
