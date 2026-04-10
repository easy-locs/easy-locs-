import { useNavigate } from "react-router-dom";
import { formatMoneyByCountry } from "@/lib/currency-engine";
import { useQuery } from "@tanstack/react-query";
import { adminOpsService } from "@/services";

export default function AdminMerchantPromoWatchPage() {
  const navigate = useNavigate();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-merchant-promo-watch"],
    queryFn: () => adminOpsService.fetchCouponsWithMerchant(300) as Promise<any[]>,
    staleTime: 5000,
  });

  const active = rows.filter((r: any) => !!r.is_active).length;
  const inactive = rows.filter((r: any) => !r.is_active).length;

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Merchant Promo Watch</h1>
          <p className="text-xs text-muted-foreground">Review active merchant campaigns</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 pb-4">
        <Metric title="Active" value={String(active)} />
        <Metric title="Inactive" value={String(inactive)} />
      </div>

      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="mx-4 mb-3 h-16 rounded-2xl bg-muted animate-pulse" />
      ))}

      {!isLoading && rows.length > 0 && (
        <div className="px-4 space-y-3">
          {rows.map((row: any) => (
            <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
              <p className="text-sm font-semibold text-foreground">{row.title}</p>
              <p className="text-xs text-muted-foreground">{row.seed_merchants?.name || "Merchant"}</p>
              <p className="text-xs text-muted-foreground">
                {row.discount_type === "percent"
                  ? `${Number(row.discount_value ?? 0)}% off`
                  : `${formatMoneyByCountry(Number(row.discount_value ?? 0), null, "AED")} off`}
              </p>
              <p className={`text-[11px] font-bold mt-1 ${row.is_active ? "text-emerald-500" : "text-muted-foreground"}`}>
                {row.is_active ? "Active" : "Inactive"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4 text-center">
      <p className="text-[11px] text-muted-foreground">{title}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}
