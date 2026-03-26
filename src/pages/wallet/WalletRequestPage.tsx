/**
 * WalletRequestPage — Request money from another user (unified engine)
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("/wallet/hub")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Request Money</h1>
          <p className="text-xs text-muted-foreground">Ask someone to send you money</p>
        </div>
      </div>
      <div className="px-4 space-y-4">
        <input value={targetEmail} onChange={(e) => setTargetEmail(e.target.value)} placeholder="Email of sender" className="w-full rounded-xl border border-border/20 bg-background px-3 py-3 text-sm" />
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="w-full rounded-xl border border-border/20 bg-background px-3 py-3 text-sm" />
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Note" className="w-full rounded-xl border border-border/20 bg-background px-3 py-3 text-sm resize-none" />
        <button onClick={submit} disabled={saving} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold disabled:opacity-50">
          {saving ? "Sending..." : "Send Request"}
        </button>
      </div>
    </div>
  );
}
