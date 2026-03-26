import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function MerchantCustomersPage() {
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["merchant-customers-page", merchantId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("orders")
        .select("customer_user_id,total_amount,status,created_at")
        .eq("merchant_id", merchantId)
        .limit(1000);

      if (error) throw error;

      const grouped = new Map<string, any>();

      for (const row of data ?? []) {
        const userId = String((row as any).customer_user_id ?? "");
        if (!userId) continue;

        if (!grouped.has(userId)) {
          grouped.set(userId, {
            userId,
            totalOrders: 0,
            totalSpent: 0,
            completedOrders: 0,
            lastOrderAt: (row as any).created_at ?? null,
          });
        }

        const entry = grouped.get(userId);
        entry.totalOrders += 1;
        entry.totalSpent += Number((row as any).total_amount ?? 0);

        if (["completed", "delivered"].includes(String((row as any).status ?? ""))) {
          entry.completedOrders += 1;
        }

        if (
          (row as any).created_at &&
          (!entry.lastOrderAt ||
            new Date((row as any).created_at).getTime() >
              new Date(entry.lastOrderAt).getTime())
        ) {
          entry.lastOrderAt = (row as any).created_at;
        }
      }

      return Array.from(grouped.values()).sort(
        (a: any, b: any) => b.totalSpent - a.totalSpent
      );
    },
    enabled: !!merchantId,
    staleTime: 10000,
  });

  return (
    <div className="app-mobile-page bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate(`/merchant/dashboard/${merchantId}`)}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Customers</h1>
          <p className="text-xs text-muted-foreground">Top buyers and repeat customers</p>
        </div>
      </div>

      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="mx-4 mb-3 h-24 rounded-2xl bg-muted animate-pulse" />
      ))}

      {!isLoading && rows.length === 0 && (
        <div className="px-4 py-12 text-center text-sm text-muted-foreground">
          No customers yet
        </div>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="px-4 space-y-3">
          {rows.map((row: any) => (
            <div key={row.userId} className="rounded-2xl border border-border/20 bg-card p-4 space-y-1">
              <p className="text-sm font-bold text-foreground">User {String(row.userId).slice(0, 8)}</p>
              <p className="text-xs text-muted-foreground">
                Orders {row.totalOrders} · Completed {row.completedOrders}
              </p>
              <p className="text-xs font-bold text-primary">
                Spent {Number(row.totalSpent ?? 0).toFixed(2)} AED
              </p>
              <p className="text-[11px] text-muted-foreground">
                Last order{" "}
                {row.lastOrderAt ? new Date(row.lastOrderAt).toLocaleString() : "-"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
