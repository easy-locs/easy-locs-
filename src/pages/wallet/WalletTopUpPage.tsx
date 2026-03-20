import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { postWalletTransaction } from "@/lib/wallet/ledger";

export default function WalletTopUpPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [amount, setAmount] = useState("100");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!user?.id) {
      toast.error("Please sign in first");
      return;
    }

    try {
      setSaving(true);
      await postWalletTransaction({
        ownerUserId: user.id,
        amount: Number(amount ?? 0),
        currency: "AED",
        direction: "in",
        entryType: "top_up",
        note: "Manual top up",
      });
      toast.success("Top up successful");
      navigate("/wallet/hub");
    } catch (err: any) {
      toast.error(err.message || "Top up failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/wallet/hub")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Top Up Wallet</h1>
          <p className="text-xs text-muted-foreground">Add balance manually</p>
        </div>
      </div>

      <div className="px-4 space-y-4">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          className="w-full rounded-xl border border-border/20 bg-background px-3 py-3 text-sm"
        />
        <button
          onClick={submit}
          disabled={saving}
          className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold disabled:opacity-50"
        >
          {saving ? "Processing..." : "Top Up"}
        </button>
      </div>
    </div>
  );
}
