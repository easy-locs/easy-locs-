/**
 * RefundRequestPage — Fast refund workflow with auto approval.
 */
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BackCard } from "@/components/ui/back-card";
import { createRefundRequest } from "@/lib/refunds/create-refund-request";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function RefundRequestPage() {
  const navigate = useNavigate();
  const { rideRequestId } = useParams();
  const { user } = useAuth();

  const [amount, setAmount] = useState("10");
  const [reason, setReason] = useState("driver_no_show");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!user?.id) { toast.error("Please sign in"); return; }
    setLoading(true);
    try {
      const result = await createRefundRequest({
        userId: user.id,
        contextType: "ride",
        contextId: rideRequestId ?? null,
        amount: Number(amount),
        reason,
        riskScore: 0,
      });
      toast.success(result.autoApproved ? "Refund auto-approved!" : "Refund request submitted");
      navigate("/wallet");
    } catch {
      toast.error("Failed to submit refund");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-mobile-page bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <BackCard />
        <div>
          <h1 className="text-xl font-bold text-foreground">Request refund</h1>
          <p className="text-sm text-muted-foreground">Fast refund workflow with auto approval when eligible</p>
        </div>

        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
          placeholder="Amount"
        />

        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
          placeholder="Reason"
        />

        <button
          onClick={submit}
          disabled={loading}
          className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
        >
          {loading ? "Submitting..." : "Submit refund"}
        </button>
      </div>
    </div>
  );
}
