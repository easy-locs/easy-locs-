import { useState } from "react";
import { toast } from "sonner";
import { validateCoupon } from "@/lib/coupons/couponEngine";

export default function CouponBox({
  merchantId,
  subtotal,
  onApplied,
}: {
  merchantId?: string | null;
  subtotal: number;
  onApplied: (payload: {
    code: string;
    discountAmount: number;
    finalTotal: number;
    promo: any;
  } | null) => void;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const apply = async () => {
    if (!merchantId) {
      toast.error("No merchant selected");
      return;
    }

    try {
      setLoading(true);
      const res = await validateCoupon({ merchantId, code, subtotal });

      if (!res.valid || !res.promo) {
        onApplied(null);
        toast.error(res.message);
        return;
      }

      onApplied({
        code,
        discountAmount: Number(res.discountAmount ?? 0),
        finalTotal: Number(res.finalTotal ?? subtotal),
        promo: res.promo,
      });
      toast.success(res.message);
    } catch (err: any) {
      onApplied(null);
      toast.error(err.message || "Coupon validation failed");
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setCode("");
    onApplied(null);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-foreground">Coupon</p>

      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter promo code"
          className="flex-1 rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm"
        />
        <button
          onClick={apply}
          disabled={loading}
          className="rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-bold disabled:opacity-50"
        >
          {loading ? "..." : "Apply"}
        </button>
      </div>

      <button onClick={clear} className="text-xs text-muted-foreground underline">
        Clear coupon
      </button>
    </div>
  );
}
