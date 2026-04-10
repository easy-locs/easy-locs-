import { useState } from "react";
import { usePayoutStore } from "@/stores/payoutStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PayoutPanel() {
  const [amount, setAmount] = useState("");
  const [destinationRef, setDestinationRef] = useState("");
  const { createPayoutRequest, items, loading } = usePayoutStore();

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <h3 className="text-lg font-bold text-foreground">Payout Requests</h3>

      <Input
        type="number"
        placeholder="Amount AED"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <Input
        placeholder="Destination (IBAN / ref)"
        value={destinationRef}
        onChange={(e) => setDestinationRef(e.target.value)}
      />

      <Button
        className="w-full rounded-xl"
        disabled={loading || !amount}
        onClick={() =>
          void createPayoutRequest({
            amount: Number(amount),
            currency: "AED",
            destinationType: "bank",
            destinationRef,
            note: "Manual payout request",
          })
        }
      >
        {loading ? "Processing…" : "Request Payout"}
      </Button>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-border p-3 space-y-1">
            <p className="text-xs font-medium text-foreground">{item.id}</p>
            <p className="text-xs text-muted-foreground">Status: {item.status}</p>
            <p className="text-xs text-muted-foreground">
              {item.amount} {item.currency}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
