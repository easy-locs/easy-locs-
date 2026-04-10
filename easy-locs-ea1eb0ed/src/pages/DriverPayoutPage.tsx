/**
 * DriverPayoutPage — /driver/payout — Withdraw earnings.
 */
import { useEffect, useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import { Button } from "@/components/ui/button";
import * as repo from "@/repositories/mobility.repository";
import { requestDriverPayout } from "@/lib/wallet/request-payout";

export default function DriverPayoutPage() {
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
    <div className="app-mobile-page bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <BackCard />
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
    </div>
  );
}
