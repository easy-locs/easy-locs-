import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, RotateCcw, Eye } from "lucide-react";
import { toast } from "sonner";
import { fetchPendingRefunds, approveRefund, rejectRefund } from "@/repositories/payments.repository";

interface RefundItemRaw {
  id: string;
  context_id: string;
  context_type: string;
  user_id: string;
  user_email?: string;
  amount: number;
  currency: string;
  reason?: string;
  refund_status: string;
  created_at: string;
  stripe_payment_intent_id?: string;
}

interface RefundItem {
  id: string;
  booking_id: string;
  booking_type: string;
  user_id: string;
  user_email?: string;
  amount: number;
  currency: string;
  reason?: string;
  status: "pending" | "approved" | "rejected" | "processed" | "failed";
  created_at: string;
  stripe_payment_intent_id?: string;
}

function normalizeRefund(raw: RefundItemRaw): RefundItem {
  return {
    id: raw.id,
    booking_id: raw.context_id,
    booking_type: raw.context_type,
    user_id: raw.user_id,
    user_email: raw.user_email,
    amount: raw.amount,
    currency: raw.currency,
    reason: raw.reason,
    status: (raw.refund_status || "pending") as RefundItem["status"],
    created_at: raw.created_at,
    stripe_payment_intent_id: raw.stripe_payment_intent_id,
  };
}

export default function AdminRefundPanel() {
  const [refunds, setRefunds] = useState<RefundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const loadRefunds = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPendingRefunds({ status: filter });
      const rawRefunds = data?.refunds || [];
      setRefunds(rawRefunds.map(normalizeRefund));
    } catch {
      toast.error("Failed to load refund requests");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadRefunds();
  }, [loadRefunds]);

  const handleApprove = async (refund: RefundItem) => {
    setActionLoading(refund.id);
    try {
      await approveRefund({
        refund_id: refund.id,
        booking_id: refund.booking_id,
        booking_type: refund.booking_type,
      });
      toast.success("Refund approved and processed");
      await loadRefunds();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve refund");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (refund: RefundItem) => {
    setActionLoading(`reject-${refund.id}`);
    try {
      await rejectRefund({
        refund_id: refund.id,
        reason: "Rejected by admin",
      });
      toast.success("Refund request rejected");
      await loadRefunds();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject refund");
    } finally {
      setActionLoading(null);
    }
  };

  const statusColors: Record<string, string> = {
    pending: "text-amber-500 bg-amber-500/10",
    approved: "text-blue-500 bg-blue-500/10",
    processed: "text-green-500 bg-green-500/10",
    rejected: "text-red-500 bg-red-500/10",
    failed: "text-red-500 bg-red-500/10",
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground">Refund Requests</h3>
        <div className="flex items-center gap-2">
          <Button
            variant={filter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("pending")}
            className="rounded-lg text-xs"
          >
            Pending
          </Button>
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
            className="rounded-lg text-xs"
          >
            All
          </Button>
          <Button variant="ghost" size="sm" onClick={loadRefunds} className="rounded-lg">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : refunds.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">No refund requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {refunds.map((refund) => (
            <div key={refund.id} className="rounded-xl border border-border/20 p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">
                    {refund.amount} {refund.currency}
                  </p>
                  <p className="text-[0.625rem] text-muted-foreground">
                    {refund.booking_type} · {refund.booking_id.slice(0, 8)}...
                  </p>
                  {refund.user_email && (
                    <p className="text-[0.625rem] text-muted-foreground">{refund.user_email}</p>
                  )}
                </div>
                <span className={`text-[0.625rem] font-bold px-2 py-0.5 rounded-full capitalize ${statusColors[refund.status] || ""}`}>
                  {refund.status}
                </span>
              </div>

              {refund.reason && (
                <div className="flex items-start gap-1.5 p-2 rounded-lg bg-muted/30">
                  <Eye className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-[0.625rem] text-muted-foreground">{refund.reason}</p>
                </div>
              )}

              <p className="text-[0.5625rem] text-muted-foreground">
                {new Date(refund.created_at).toLocaleString()}
              </p>

              {refund.status === "pending" && (
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(refund)}
                    disabled={!!actionLoading}
                    className="flex-1 rounded-lg text-xs h-8"
                  >
                    {actionLoading === refund.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <><CheckCircle2 className="h-3 w-3 mr-1" /> Approve & Process</>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReject(refund)}
                    disabled={!!actionLoading}
                    className="flex-1 rounded-lg text-xs h-8"
                  >
                    {actionLoading === `reject-${refund.id}` ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <><XCircle className="h-3 w-3 mr-1" /> Reject</>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
