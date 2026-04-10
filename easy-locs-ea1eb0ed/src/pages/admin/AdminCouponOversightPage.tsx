import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { adminOpsService } from "@/services";

export default function AdminCouponOversightPage() {
  const navigate = useNavigate();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-coupon-oversight"],
    queryFn: () => adminOpsService.fetchCouponsWithMerchant(500) as Promise<any[]>,
    staleTime: 5000,
  });

  const active = rows.filter((r: any) => !!r.is_active).length;
  const percent = rows.filter((r: any) => String(r.discount_type) === "percent").length;
  const fixed = rows.filter((r: any) => String(r.discount_type) === "fixed").length;

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Coupon Oversight</h1>
          <p className="text-xs text-muted-foreground">Promo health across merchants</p>
        </div>
      </div>

      {!isLoading && (
        <div className="grid grid-cols-3 gap-3 px-4 mb-4">
          <Metric title="Active" value={String(active)} />
          <Metric title="Percent" value={String(percent)} />
          <Metric title="Fixed" value={String(fixed)} />
        </div>
      )}

      {isLoading && [1, 2].map((i) => (<div key={i} className="mx-4 mb-3 h-20 rounded-2xl bg-muted animate-pulse" />))}

      {!isLoading && rows.length > 0 && (
        <div className="px-4 space-y-3">
          {rows.slice(0, 40).map((row: any) => (
            <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
              <p className="text-sm font-bold text-foreground">{row.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{row.seed_merchants?.name || "Merchant"}</p>
              <p className="text-xs text-primary font-semibold mt-1">
                {String(row.discount_type) === "percent" ? `${Number(row.discount_value ?? 0)}%` : `${Number(row.discount_value ?? 0).toFixed(2)} AED`}
              </p>
              <p className="text-[11px] text-muted-foreground/70 mt-1">Min order {Number(row.minimum_order_amount ?? 0).toFixed(2)} AED</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}
