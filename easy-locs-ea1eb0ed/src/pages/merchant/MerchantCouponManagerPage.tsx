import { useState } from "react";
import { formatMoneyByCountry } from "@/lib/currency-engine";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { merchantService } from "@/services/merchant.service";
import { createCoupon } from "@/lib/coupons/couponEngine";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function MerchantCouponManagerPage() {
  useUiEngine("merchant-merchantcouponmanagerpage");
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();

  const [title, setTitle] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("10");
  const [minimumOrderAmount, setMinimumOrderAmount] = useState("0");
  const [saving, setSaving] = useState(false);

  const { data: rows = [], isLoading, refetch, isError } = useQuery({
    queryKey: ["merchant-coupon-manager", merchantId],
    queryFn: () => merchantService.fetchPromos(merchantId),
    enabled: !!merchantId,
    staleTime: 5000,
  });

  const submit = async () => {
    if (!title.trim()) {
      toast.error("Enter coupon title");
      return;
    }

    try {
      setSaving(true);
      await createCoupon({
        merchantId,
        title,
        discountType,
        discountValue: Number(discountValue ?? 0),
        minimumOrderAmount: Number(minimumOrderAmount ?? 0),
      });
      setTitle("");
      setDiscountValue("10");
      setMinimumOrderAmount("0");
      toast.success("Coupon created");
      refetch();
    } catch (err: any) {
      toast.error("Could not create coupon");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (row: any) => {
    try {
      await merchantService.togglePromo(row.id, row.is_active);
      refetch();
    } catch (err: any) {
      toast.error("Could not update coupon");
    }
  };

  return (
    <SubPageShell
      title="Coupon Manager"
      subtitle="Create and manage promo codes"
      onBack={() => navigate(`/merchant/dashboard/${merchantId}`)}
      noContentPad
    >
      <div className="mx-4 mt-4 rounded-2xl border border-border/20 bg-card p-4 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Coupon code / title"
          className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm"
        />
        <select
          value={discountType}
          onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed")}
          className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm"
        >
          <option value="percent">Percent</option>
          <option value="fixed">Fixed AED</option>
        </select>
        <input
          type="number"
          value={discountValue}
          onChange={(e) => setDiscountValue(e.target.value)}
          placeholder="Discount value"
          className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm"
        />
        <input
          type="number"
          value={minimumOrderAmount}
          onChange={(e) => setMinimumOrderAmount(e.target.value)}
          placeholder="Minimum order amount"
          className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm"
        />
        <button
          onClick={submit}
          disabled={saving}
          className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold disabled:opacity-50"
        >
          {saving ? "Creating..." : "Create Coupon"}
        </button>
      </div>

      {isError && (
        <div className="px-4 mt-3">
          <p className="text-sm text-destructive">Something went wrong. Please try again.</p>
        </div>
      )}
      {isLoading && [1, 2].map((i) => (
        <div key={i} className="mx-4 mt-3 h-16 rounded-2xl bg-muted animate-pulse" />
      ))}

      {!isLoading && rows.length === 0 && (
        <p className="text-center text-sm text-muted-foreground pt-8">No coupons yet</p>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="px-4 pt-4 space-y-3">
          {rows.map((row: any) => (
            <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{row.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {row.discount_type === "percent"
                      ? `${Number(row.discount_value ?? 0)}% off`
                      : `${formatMoneyByCountry(Number(row.discount_value ?? 0), null, "AED")} off`}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70">
                    Min {formatMoneyByCountry(Number(row.minimum_order_amount ?? 0), null, "AED")}
                  </p>
                </div>
                <button
                  onClick={() => toggle(row)}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                    row.is_active
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {row.is_active ? "Active" : "Inactive"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SubPageShell>
  );
}
