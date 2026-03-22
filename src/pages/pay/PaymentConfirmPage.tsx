/**
 * PaymentConfirmPage — End-to-end payment confirmation.
 * Resolves target from URL params, shows profile, confirms transfer.
 */
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, User, Loader2 } from "lucide-react";
import { AppCard } from "@/components/ui/AppCard";
import { AppActionButton } from "@/components/ui/AppActionButton";
import { resolvePayTarget, type ResolvedTarget } from "@/lib/pay/resolvePayTarget";
import { walletTransfer } from "@/payments/wallet-hooks";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function PaymentConfirmPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [target, setTarget] = useState<ResolvedTarget | null>(null);
  const [amount, setAmount] = useState(params.get("amount") ?? "");
  const [currency] = useState(params.get("currency") ?? "AED");
  const [note, setNote] = useState(params.get("note") ?? "");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const resolved = await resolvePayTarget({
          userId: params.get("userId"),
          orbitId: params.get("orbitId"),
          email: params.get("email"),
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
    if (!target?.id || !user?.id) return;
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) { toast.error("Enter a valid amount"); return; }
    if (target.id === user.id) { toast.error("Cannot pay yourself"); return; }

    setSending(true);
    try {
      await walletTransfer({
        senderId: user.id,
        recipientId: target.id,
        amount: numAmount,
        currency,
        contextType: "qr_payment",
        title: note.trim() || `Pay ${target.display_name || "user"}`,
      });
      setSent(true);
      toast.success("Payment sent!");
      setTimeout(() => navigate("/wallet/hub", { replace: true }), 1500);
    } catch (err: any) {
      toast.error(err.message || "Payment failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
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
            <CheckCircle2 className="h-14 w-14 text-green-500" />
            <p className="text-lg font-bold text-foreground">Payment Sent</p>
            <p className="text-sm text-muted-foreground">{amount} {currency} to {target?.display_name || "user"}</p>
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
                {target.avatar_url ? (
                  <img src={target.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground truncate">{target.display_name || "Unknown"}</p>
                <p className="text-xs text-muted-foreground truncate">{target.email || target.id}</p>
              </div>
            </AppCard>

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

            <AppActionButton full loading={sending} onClick={confirm} disabled={!amount || Number(amount) <= 0}>
              {sending ? "Sending…" : `Pay ${amount || "0"} ${currency}`}
            </AppActionButton>
          </>
        )}
      </div>
    </div>
  );
}
