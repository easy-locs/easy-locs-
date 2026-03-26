/**
 * WalletRequestPage — Request money from another user (unified engine)
 * Premium UX with staggered animations and polished form.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Send, Loader2, Mail, DollarSign, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

const QUICK_AMOUNTS = [25, 50, 100, 250, 500];

export default function WalletRequestPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [targetEmail, setTargetEmail] = useState("");
  const [amount, setAmount] = useState("25");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!user?.id) { toast.error("Please sign in first"); return; }
    if (!targetEmail.trim()) { toast.error("Enter target email"); return; }
    const numAmount = Number(amount ?? 0);
    if (!numAmount || numAmount <= 0) { toast.error("Enter a valid amount"); return; }

    try {
      setSaving(true);
      const { error } = await (supabase as any)
        .from("unified_wallet_transactions")
        .insert({
          sender_id: user.id,
          recipient_id: user.id,
          amount: numAmount,
          currency: "AED",
          context_type: "request",
          title: note.trim() || "Payment Request",
          subtitle: `Request to ${targetEmail}`,
          status: "pending",
          metadata: { requested_from_email: targetEmail, is_request: true },
        });
      if (error) throw error;
      toast.success("Request sent");
      navigate("/wallet/hub");
    } catch (err: any) {
      toast.error(err.message || "Request failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-mobile-page app-mobile-content bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/wallet/hub")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-[0.95] transition-transform"
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Request Money</h1>
          <p className="text-xs text-muted-foreground">Ask someone to send you money</p>
        </div>
      </div>

      <div className="px-4 space-y-5">
        {/* Recipient */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-1.5"
        >
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" /> Recipient email
          </label>
          <input
            value={targetEmail}
            onChange={(e) => setTargetEmail(e.target.value)}
            placeholder="name@example.com"
            type="email"
            className="w-full rounded-xl border border-border/30 bg-card px-3 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
          />
        </motion.div>

        {/* Quick amounts */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" /> Amount
          </label>
          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((a) => (
              <button
                key={a}
                onClick={() => setAmount(String(a))}
                className={`rounded-xl px-4 py-2 text-sm font-medium border transition-all active:scale-[0.97] ${
                  amount === String(a)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border/30 hover:bg-accent/5"
                }`}
              >
                {a} AED
              </button>
            ))}
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Custom amount"
            min="1"
            className="w-full rounded-xl border border-border/30 bg-card px-3 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
          />
        </motion.div>

        {/* Note */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-1.5"
        >
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> Note (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="What's this for?"
            className="w-full rounded-xl border border-border/30 bg-card px-3 py-3 text-sm text-foreground resize-none outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
          />
        </motion.div>

        {/* Submit */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={submit}
            disabled={saving || !targetEmail.trim() || Number(amount) <= 0}
            className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3.5 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.97] transition-transform"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {saving ? "Sending…" : `Request ${amount || "0"} AED`}
          </button>
        </motion.div>

        <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed">
          The recipient will receive a notification and can approve the payment from their wallet.
        </p>
      </div>
    </div>
  );
}
