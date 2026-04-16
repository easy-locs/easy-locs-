import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { merchantService } from "@/services/merchant.service";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function MerchantCustomersPage() {
  useUiEngine("merchant-merchantcustomerspage");
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["merchant-customers-page", merchantId],
    queryFn: async () => {
      const data = await merchantService.fetchCustomerOrders(merchantId);

      const grouped = new Map<string, any>();

      for (const row of data) {
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
    <SubPageShell title="Customers" subtitle="Top buyers and repeat customers" onBack={() => navigate(`/merchant/dashboard/${merchantId}`)} noContentPad>
      {isError && (
        <div className="px-4 py-4">
          <p className="text-sm text-destructive">Something went wrong. Please try again.</p>
        </div>
      )}
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
              <p className="text-[0.6875rem] text-muted-foreground">
                Last order{" "}
                {row.lastOrderAt ? new Date(row.lastOrderAt).toLocaleString() : "-"}
              </p>
            </div>
          ))}
        </div>
      )}
    </SubPageShell>
  );
}
