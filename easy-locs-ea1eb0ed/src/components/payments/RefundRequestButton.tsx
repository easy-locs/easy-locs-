import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { requestRefund } from "@/repositories/payments.repository";

interface RefundRequestButtonProps {
  bookingId: string;
  bookingType?: "marketplace" | "storefront" | "concierge" | "rent" | "property";
  amount?: number;
  currency?: string;
  onRefundRequested?: (refundId: string) => void;
}

export default function RefundRequestButton({
  bookingId,
  bookingType = "marketplace",
  amount,
  currency,
  onRefundRequested,
}: RefundRequestButtonProps) {
  const [stage, setStage] = useState<"idle" | "confirm" | "submitting" | "submitted" | "error">("idle");
  const [reason, setReason] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refundId, setRefundId] = useState<string | null>(null);

  const handleRequest = async () => {
    setStage("submitting");
    setErrorMsg(null);

    try {
      const result = await requestRefund({
        booking_id: bookingId,
        booking_type: bookingType,
        reason: reason || undefined,
      });

      if (result?.refund_id || result?.success) {
        setRefundId(result.refund_id);
        setStage("submitted");
        toast.success("Refund request submitted");
        onRefundRequested?.(result.refund_id);
      } else {
        throw new Error(result?.error || "Refund request failed");
      }
    } catch (err: any) {
      const msg = err.message || "Failed to submit refund request";
      setErrorMsg(msg);
      setStage("error");
      toast.error(msg);
    }
  };

  if (stage === "submitted") {
    return (
      <div className="p-4 rounded-2xl border border-green-500/20 bg-green-500/5 space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <p className="text-sm font-bold text-green-500">Refund requested</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Your refund request has been submitted for review. You&apos;ll be notified once it&apos;s processed.
        </p>
        {refundId && (
          <p className="text-[10px] text-muted-foreground font-mono">Ref: {refundId}</p>
        )}
      </div>
    );
  }

  if (stage === "idle") {
    return (
      <Button
        variant="outline"
        onClick={() => setStage("confirm")}
        className="rounded-xl text-xs"
      >
        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
        Request Refund
      </Button>
    );
  }

  return (
    <div className="p-4 rounded-2xl border border-border/20 bg-card space-y-3">
      <h3 className="text-sm font-bold text-foreground">Request a Refund</h3>

      {amount != null && currency && (
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Refund amount</span>
          <span className="font-bold text-foreground">{amount} {currency}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Reason (optional)</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Tell us why you'd like a refund..."
          className="w-full rounded-xl p-3 text-sm resize-none h-20 bg-muted/30 border border-border/20"
          disabled={stage === "submitting"}
        />
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 rounded-lg px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="ghost"
          onClick={() => { setStage("idle"); setReason(""); setErrorMsg(null); }}
          disabled={stage === "submitting"}
          className="flex-1 rounded-xl text-xs"
        >
          Cancel
        </Button>
        <Button
          onClick={handleRequest}
          disabled={stage === "submitting"}
          variant="destructive"
          className="flex-1 rounded-xl text-xs"
        >
          {stage === "submitting" ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Submitting...</>
          ) : (
            <><RotateCcw className="h-3.5 w-3.5 mr-1" /> Confirm Refund</>
          )}
        </Button>
      </div>
    </div>
  );
}
