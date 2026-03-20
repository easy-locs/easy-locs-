import { toast } from "sonner";
import { moveOrderToNextState } from "@/lib/core/realtimeOrderStateEngine";

export function MerchantLiveFulfillmentPanel({
  orderId,
  status,
  onDone,
}: {
  orderId: string;
  status: string;
  onDone?: () => void;
}) {
  const advance = async () => {
    try {
      await moveOrderToNextState(orderId);
      toast.success("Order advanced");
      onDone?.();
    } catch (e: any) {
      toast.error(e.message || "Could not advance order");
    }
  };

  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
      <p className="text-sm font-bold text-foreground">Fulfillment Control</p>
      <p className="text-xs text-muted-foreground">
        Current: {status.replace(/_/g, " ")}
      </p>
      <button
        onClick={advance}
        className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold"
      >
        Advance To Next Step
      </button>
    </div>
  );
}
