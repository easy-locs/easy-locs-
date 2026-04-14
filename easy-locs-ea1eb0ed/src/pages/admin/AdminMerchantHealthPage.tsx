import SubPageShell from "@/components/layout/SubPageShell";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { adminOpsService } from "@/services";
import { isMerchantOpenNow } from "@/lib/merchant/availabilityEngine";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function AdminMerchantHealthPage() {
  useUiEngine("admin-adminmerchanthealthpage");
  const navigate = useNavigate();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-merchant-health-page"],
    queryFn: async () => {
      const { merchants, products, promos } = await adminOpsService.fetchMerchantHealthData();

      return (merchants ?? []).map((merchant: any) => {
        const merchantProducts = (products ?? []).filter(
          (p: any) => p.merchant_id === merchant.id
        );
        const merchantPromos = (promos ?? []).filter(
          (p: any) => p.merchant_id === merchant.id
        );

        const stockOut = merchantProducts.filter(
          (p: any) => Number(p.stock_quantity ?? 0) <= 0
        ).length;

        const openStatus = isMerchantOpenNow(merchant.opening_hours ?? null);

        return {
          id: merchant.id,
          name: merchant.name,
          rating: Number(merchant.rating ?? 0),
          visibility: Number(merchant.visibility_score ?? 0),
          isActive: !!merchant.is_active,
          isOpen: !!merchant.is_open,
          computedOpen: openStatus.open,
          openReason: openStatus.reason,
          productCount: merchantProducts.length,
          stockOut,
          activePromos: merchantPromos.filter((p: any) => !!p.is_active).length,
        };
      });
    },
    staleTime: 10000,
  });

  return (
    <SubPageShell noContentPad className="bg-background">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/admin")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Merchant Health</h1>
          <p className="text-xs text-muted-foreground">Operational quality overview</p>
        </div>
      </div>

      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="mx-4 mb-3 h-24 rounded-2xl bg-muted animate-pulse" />
      ))}

      {!isLoading && rows.length > 0 && (
        <div className="px-4 space-y-3">
          {rows.slice(0, 40).map((row: any) => (
            <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4 space-y-1">
              <p className="text-sm font-bold text-foreground">{row.name}</p>
              <p className="text-xs text-muted-foreground">
                Rating {row.rating.toFixed(1)} · Visibility {row.visibility}
              </p>
              <p className="text-xs text-muted-foreground">
                Products {row.productCount} · Stock out {row.stockOut} · Promos {row.activePromos}
              </p>
              <p className="text-xs text-muted-foreground">
                Flag {row.isOpen ? "Open" : "Closed"} · Schedule {row.computedOpen ? "Open" : "Closed"}
              </p>
              <p className="text-[11px] text-muted-foreground/70">
                {row.openReason}
              </p>
            </div>
          ))}
        </div>
      )}
    </SubPageShell>
  );
}
