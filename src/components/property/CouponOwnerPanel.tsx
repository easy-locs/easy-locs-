import { useEffect, useState } from "react";
import { useCouponsStore } from "@/stores/couponsStore";

export function CouponOwnerPanel() {
  const hydrateOwnerCoupons = useCouponsStore((s) => s.hydrateOwnerCoupons);
  const createCoupon = useCouponsStore((s) => s.createCoupon);
  const toggleCoupon = useCouponsStore((s) => s.toggleCoupon);
  const items = useCouponsStore((s) => s.items);

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"flat" | "percent">("percent");
  const [discountValue, setDiscountValue] = useState("10");

  useEffect(() => {
    void hydrateOwnerCoupons();
  }, [hydrateOwnerCoupons]);

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Coupons</h3>

      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="CODE"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
        />
        <select
          value={discountType}
          onChange={(e) => setDiscountType(e.target.value as "flat" | "percent")}
          className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
        >
          <option value="percent">Percent</option>
          <option value="flat">Flat</option>
        </select>
        <input
          type="number"
          value={discountValue}
          onChange={(e) => setDiscountValue(e.target.value)}
          className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
        />
      </div>

      <button
        className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        onClick={() =>
          void createCoupon({
            code,
            discountType,
            discountValue: Number(discountValue),
          }).then(() => {
            setCode("");
            setDiscountValue("10");
          })
        }
      >
        Create Coupon
      </button>

      <div className="space-y-2">
        {items.map((coupon) => (
          <div key={coupon.id} className="rounded-lg border border-border bg-card p-3 space-y-1">
            <p className="text-sm font-semibold text-foreground">{coupon.code}</p>
            <p className="text-xs text-muted-foreground">
              {coupon.discount_type} / {coupon.discount_value}
            </p>
            <p className="text-xs text-muted-foreground">
              Used {coupon.used_count} / {coupon.usage_limit ?? "∞"}
            </p>
            <button
              className="text-xs text-primary underline"
              onClick={() => void toggleCoupon(coupon.id, !coupon.active)}
            >
              {coupon.active ? "Deactivate" : "Activate"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
