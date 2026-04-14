/**
 * RefundRequestPage — Fast refund workflow with auto approval.
 */
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SubPageShell from "@/components/layout/SubPageShell";
import { createRefundRequest } from "@/lib/refunds/create-refund-request";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function RefundRequestPage() {
  useUiEngine("refundrequestpage");
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
    <SubPageShell title="Request Refund" subtitle="Fast refund with auto approval when eligible" onBack={() => navigate(-1)}>
      <div className="max-w-lg mx-auto space-y-6">
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
    </SubPageShell>
  );
}
