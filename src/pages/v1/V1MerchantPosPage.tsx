import { useQuery } from "@tanstack/react-query";
import { V1PrimaryAppBridge } from "@/components/v1/V1PrimaryAppBridge";
import { getMerchantDashboardSummary } from "@/lib/v1/v1MerchantCore";

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-border/20 bg-card p-4 text-center">
      <div className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground">{title}</div>
      <div className="text-xl font-bold mt-1 text-foreground">{value}</div>
    </div>
  );
}

function MerchantPosBody({ merchantId }: { merchantId: string }) {
  const { data } = useQuery({
    queryKey: ["v1-merchant-summary", merchantId],
    queryFn: () => getMerchantDashboardSummary(merchantId),
    enabled: !!merchantId,
    staleTime: 10_000,
  });

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-28 space-y-5">
      <h1 className="text-lg font-bold text-foreground">Merchant POS</h1>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard title="Active Orders" value={String(data?.activeOrders ?? 0)} />
        <MetricCard title="Completed" value={String(data?.completedOrders ?? 0)} />
        <MetricCard title="Gross Sales" value={`${Number(data?.grossSales ?? 0).toFixed(2)} AED`} />
        <MetricCard title="Captured" value={String(data?.capturedPayments ?? 0)} />
      </div>
    </div>
  );
}

export default function V1MerchantPosPage() {
  return (
    <V1PrimaryAppBridge module="merchant_pos" requireMerchantContext>
      {(ctx) => <MerchantPosBody merchantId={ctx.merchantId!} />}
    </V1PrimaryAppBridge>
  );
}
