import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/services/db";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";
import { useFoodOrderRealtime } from "@/hooks/useFoodOrderRealtime";
import { getFoodStatusMeta } from "@/domains/restaurant/service";

interface KdsOrderRow {
  id: string;
  status: string;
  created_at: string;
  total?: number;
  total_amount?: number;
  currency?: string;
}

export default function MerchantKitchenDisplayPage() {
  useUiEngine("merchant-merchantkitchendisplaypage");
  const navigate = useNavigate();
  const { merchantId } = useParams();

  useFoodOrderRealtime(merchantId);

  const { data: rows = [], isLoading , isError } = useQuery({
    queryKey: ["merchant-kds-orders", merchantId],
    queryFn: async () => {
      const { data, error } = await db
        .from("storefront_orders")
        .select("id, status, created_at, total, currency")
        .eq("shop_id", merchantId!)
        .in("status", ["pending", "accepted", "preparing", "ready_for_pickup"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as KdsOrderRow[];
    },
    enabled: !!merchantId,
    staleTime: 5000,
    refetchInterval: 5000,
  });

  return (
    <SubPageShell>
      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Kitchen Display</h1>
          <p className="text-xs text-muted-foreground">Live order queue</p>
        </div>
      </div>

      {isError && <div className="state-container"><p className="text-sm text-destructive">Something went wrong. Please try again.</p></div>}
      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="h-24 rounded-[28px] bg-muted animate-pulse" />
      ))}

      {!isLoading && rows.length === 0 && (
        <div className="rounded-[28px] border border-border/20 bg-card p-6 text-center">
          <div className="text-3xl">🍽️</div>
          <div className="text-base font-bold mt-3">No active orders</div>
          <div className="text-sm text-muted-foreground mt-2">Kitchen queue is clear</div>
        </div>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((row: KdsOrderRow) => {
            const meta = getFoodStatusMeta(row.status);
            return (
            <div key={row.id} className="rounded-[28px] border border-border/20 bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold">Order #{String(row.id).slice(0, 8)}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(row.created_at).toLocaleTimeString()}
                  </div>
                </div>
                <span
                  className="rounded-full px-3 py-1 text-[11px] font-bold"
                  style={{ background: meta.bg, color: meta.color }}
                >
                  {meta.merchantLabel}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                {Number(row.total ?? row.total_amount ?? 0).toFixed(2)} {row.currency ?? "AED"}
              </div>
            </div>
            );
          })}
        </div>
      )}
      </div>
    </SubPageShell>
  );
}
