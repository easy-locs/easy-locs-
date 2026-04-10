import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { platformBus } from "@/lib/shared/platform-bus";

const REASONS = [
  "wrong_items",
  "missing_items",
  "late_delivery",
  "quality_issue",
  "duplicate_payment",
  "other",
];

export default function OrderRefundRequestPage() {
  const navigate = useNavigate();
  const { orderId = "" } = useParams();
  const { user } = useAuth();

  const [reason, setReason] = useState("wrong_items");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!user?.id) {
      toast.error("Please sign in first");
      return;
    }

    try {
      setSaving(true);
      platformBus.emit(
        "REFUND_REQUESTED",
        {
          orderId,
          requesterUserId: user.id,
          reason,
          details: details.trim(),
        },
        "system"
      );
      toast.success("Refund request submitted");
      navigate(`/support/tickets`);
    } catch (err: any) {
      toast.error(err.message || "Could not submit refund request");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-mobile-page app-mobile-content bg-background">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate(-1 as any)}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Refund Request</h1>
          <p className="text-xs text-muted-foreground">
            {orderId ? `Order #${orderId.slice(0, 8)}` : "Order"}
          </p>
        </div>
      </div>

      <div className="px-4 space-y-4">
        <p className="text-sm font-bold text-foreground">Reason</p>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm"
        >
          {REASONS.map((row) => (
            <option key={row} value={row}>
              {row.replace(/_/g, " ")}
            </option>
          ))}
        </select>

        <p className="text-sm font-bold text-foreground">Details</p>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={5}
          placeholder="Explain the problem..."
          className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm resize-none"
        />

        <button
          onClick={submit}
          disabled={saving}
          className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold disabled:opacity-50"
        >
          {saving ? "Sending..." : "Submit Refund Request"}
        </button>
      </div>
    </div>
  );
}
