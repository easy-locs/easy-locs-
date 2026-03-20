import { useQuery } from "@tanstack/react-query";
import { V1PrimaryAppBridge } from "@/components/v1/V1PrimaryAppBridge";
import { getMerchantPayments } from "@/lib/v1/v1MerchantCore";

function SmallPill({ value }: { value: string }) {
  const cls =
    value === "captured" || value === "paid" || value === "released"
      ? "bg-emerald-500/10 text-emerald-500"
      : value === "pending"
      ? "bg-amber-500/10 text-amber-500"
      : "bg-muted text-foreground";

  return <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${cls}`}>{value}</div>;
}

function MerchantPaymentsBody({ merchantId }: { merchantId: string }) {
  const { data: rows = [] } = useQuery({
    queryKey: ["v1-merchant-payments", merchantId],
    queryFn: () => getMerchantPayments(merchantId),
    enabled: !!merchantId,
    staleTime: 10_000,
  });

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-28 space-y-4">
      <h1 className="text-lg font-bold text-foreground">Merchant Payments</h1>

      <div className="space-y-3">
        {rows.map((row: any) => (
          <div key={row.id} className="rounded-[28px] border border-border/20 bg-card p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-foreground">Order #{String(row.id).slice(0, 8)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {Number(row.total_amount ?? 0).toFixed(2)} {row.currency ?? "AED"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(row.created_at).toLocaleString()}
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <SmallPill value={row.payment_status || "unknown"} />
                <SmallPill value={row.settlement_status || "pending"} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function V1MerchantPaymentsPage() {
  return (
    <V1PrimaryAppBridge module="merchant_payments" requireMerchantContext>
      {(ctx) => <MerchantPaymentsBody merchantId={ctx.merchantId!} />}
    </V1PrimaryAppBridge>
  );
}
