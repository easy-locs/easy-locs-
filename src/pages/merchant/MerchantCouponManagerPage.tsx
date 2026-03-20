import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { createCoupon } from "@/lib/coupons/couponEngine";
import { supabase } from "@/integrations/supabase/client";

export default function MerchantCouponManagerPage() {
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();

  const [title, setTitle] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("10");
  const [minimumOrderAmount, setMinimumOrderAmount] = useState("0");
  const [saving, setSaving] = useState(false);

  const { data: promos = [], isLoading, refetch } = useQuery({
    queryKey: ["merchant-coupon-manager", merchantId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("seed_merchant_promos")
        .select("*")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
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
        title: title.trim(),
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
      toast.error(err.message || "Could not create coupon");
    } finally {
      setSaving(false);
    }
  };

  const togglePromo = async (promo: any) => {
    try {
      const { error } = await (supabase as any)
        .from("seed_merchant_promos")
        .update({
          is_active: !promo.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", promo.id);

      if (error) throw error;
      toast.success("Coupon updated");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Could not update coupon");
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button
          onClick={() => navigate(`/merchant/dashboard/${merchantId}`)}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Coupons</h1>
          <p className="text-xs text-muted-foreground">Discounts and promo codes</p>
        </div>
      </header>

      <div className="mx-4 rounded-2xl border border-border/20 bg-card p-4 space-y-3">
        <p className="text-sm font-bold text-foreground">Create Coupon</p>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Code / title"
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

      {isLoading && [1, 2].map((i) => (
        <div key={i} className="mx-4 mt-3 h-16 rounded-2xl bg-muted animate-pulse" />
      ))}

      {!isLoading && promos.length > 0 && (
        <div className="px-4 pt-4 pb-24 space-y-3">
          {promos.map((promo: any) => (
            <div key={promo.id} className="rounded-2xl border border-border/20 bg-card p-4 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{promo.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {promo.discount_type === "percent"
                    ? `${Number(promo.discount_value ?? 0)}%`
                    : `${Number(promo.discount_value ?? 0).toFixed(2)} AED`}{" "}
                  · Min {Number(promo.minimum_order_amount ?? 0).toFixed(2)} AED
                </p>
              </div>
              <button
                onClick={() => togglePromo(promo)}
                className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                  promo.is_active
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {promo.is_active ? "Active" : "Inactive"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
