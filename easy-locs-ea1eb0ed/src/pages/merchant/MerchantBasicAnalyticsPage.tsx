import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { merchantService } from "@/services/merchant.service";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function MerchantBasicAnalyticsPage() {
  useUiEngine("merchant-merchantbasicanalyticspage");
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["merchant-basic-analytics", merchantId],
    queryFn: async () => {
      const { orders, reviews, promos } = await merchantService.fetchMerchantAnalytics(merchantId);

      return {
        totalOrders: orders.length,
        revenue: orders.reduce((sum: number, row: any) => sum + Number(row.total_amount ?? 0), 0),
        completed: orders.filter((row: any) => ["completed", "delivered"].includes(String(row.status ?? ""))).length,
        cancelled: orders.filter((row: any) => ["cancelled", "refunded", "disputed"].includes(String(row.status ?? ""))).length,
        reviewCount: reviews.length,
        avgRating: reviews.length > 0
          ? (reviews.reduce((sum: number, row: any) => sum + Number(row.rating ?? 0), 0) / reviews.length).toFixed(2)
          : "0.00",
        activePromos: promos.filter((r: any) => !!r.is_active).length,
      };
    },
    enabled: !!merchantId,
    staleTime: 10000,
  });

  return (
    <SubPageShell title="Basic Analytics" subtitle="Store performance snapshot" onBack={() => navigate(`/merchant/dashboard/${merchantId}`)} noContentPad>
      {isError && (
        <div className="px-4 py-4">
          <p className="text-sm text-destructive">Something went wrong. Please try again.</p>
        </div>
      )}
      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="mx-4 mt-3 h-16 rounded-2xl bg-muted animate-pulse" />
      ))}

      {!isLoading && data && (
        <div className="grid grid-cols-2 gap-3 px-4 py-4">
          <Metric title="Orders" value={String(data.totalOrders)} />
          <Metric title="Revenue" value={`${Number(data.revenue).toFixed(2)} AED`} />
          <Metric title="Completed" value={String(data.completed)} />
          <Metric title="Cancelled" value={String(data.cancelled)} />
          <Metric title="Reviews" value={String(data.reviewCount)} />
          <Metric title="Avg Rating" value={data.avgRating} />
          <Metric title="Active Promos" value={String(data.activePromos)} />
        </div>
      )}
    </SubPageShell>
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
