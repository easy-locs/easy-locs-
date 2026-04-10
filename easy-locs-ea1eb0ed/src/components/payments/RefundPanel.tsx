import { useState } from "react";
import { useRefundStore } from "@/stores/refundStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RefundPanel() {
  const [bookingId, setBookingId] = useState("");
  const [reason, setReason] = useState("");
  const { requestBookingRefund, processBookingRefund, items, loading } = useRefundStore();

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <h3 className="text-lg font-bold text-foreground">Refunds</h3>

      <Input
        placeholder="Booking ID"
        value={bookingId}
        onChange={(e) => setBookingId(e.target.value)}
      />
      <Input
        placeholder="Reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />

      <Button
        className="w-full rounded-xl"
        disabled={loading || !bookingId}
        onClick={() => void requestBookingRefund(bookingId, reason)}
      >
        {loading ? "Processing…" : "Request Refund"}
      </Button>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-border p-3 space-y-1">
            <p className="text-xs font-medium text-foreground">{item.id}</p>
            <p className="text-xs text-muted-foreground">Status: {item.status}</p>
            <p className="text-xs text-muted-foreground">
              {item.amount} {item.currency}
            </p>
            {item.status === "pending" && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl text-xs"
                disabled={loading}
                onClick={() => void processBookingRefund(item.id)}
              >
                Process Refund
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
