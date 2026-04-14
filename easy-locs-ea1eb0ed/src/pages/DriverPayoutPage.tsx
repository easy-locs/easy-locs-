/**
 * DriverPayoutPage — /driver/payout — Withdraw earnings.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SubPageShell from "@/components/layout/SubPageShell";
import { Button } from "@/components/ui/button";
import * as repo from "@/repositories/mobility.repository";
import { requestDriverPayout } from "@/lib/wallet/request-payout";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function DriverPayoutPage() {
  useUiEngine("driverpayoutpage");
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    repo.getCurrentUserId().then(id => setUserId(id));
  }, []);

  const handleRequest = async () => {
    if (!userId || !amount) return;
    setLoading(true);
    try { await requestDriverPayout({ driverId: userId, amount: Number(amount) }); setAmount(""); }
    finally { setLoading(false); }
  };

  return (
    <SubPageShell title="Withdraw Earnings" onBack={() => navigate(-1)}>
      <div className="max-w-lg mx-auto space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h1 className="text-lg font-bold text-foreground">Withdraw earnings</h1>
          <p className="text-xs text-muted-foreground">Request a payout to your bank account</p>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount AED"
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none" />
          <Button onClick={handleRequest} disabled={loading || !amount} className="w-full h-12 rounded-2xl text-sm font-bold">
            {loading ? "Processing…" : "Request payout"}
          </Button>
        </div>
      </div>
    </SubPageShell>
  );
}
