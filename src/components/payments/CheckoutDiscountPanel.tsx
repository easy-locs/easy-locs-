import { useState } from "react";
import { useCheckoutDiscountStore } from "@/stores/checkoutDiscountStore";

export function CheckoutDiscountPanel(props: {
  listingId?: string;
  originalAmount: number;
}) {
  const [code, setCode] = useState("");
  const appliedCode = useCheckoutDiscountStore((s) => s.appliedCode);
  const discountAmount = useCheckoutDiscountStore((s) => s.discountAmount);
  const finalAmount = useCheckoutDiscountStore((s) => s.finalAmount);
  const applyCoupon = useCheckoutDiscountStore((s) => s.applyCoupon);
  const clear = useCheckoutDiscountStore((s) => s.clear);

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Discount</h3>

      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="COUPON CODE"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
        />
        <button
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
          onClick={() =>
            applyCoupon({
              code,
              listingId: props.listingId,
              originalAmount: props.originalAmount,
            })
          }
        >
          Apply
        </button>
        <button
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground"
          onClick={clear}
        >
          Clear
        </button>
      </div>

      <p className="text-xs text-muted-foreground">Original: {props.originalAmount}</p>
      <p className="text-xs text-muted-foreground">Code: {appliedCode ?? "-"}</p>
      <p className="text-xs text-muted-foreground">Discount: {discountAmount}</p>
      <p className="text-xs font-medium text-foreground">Final: {finalAmount ?? props.originalAmount}</p>
    </div>
  );
}
