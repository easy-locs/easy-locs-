import { isMerchantOpenNow } from "@/lib/merchant/availabilityEngine";

export default function MerchantOpeningHoursQuickCard({
  openingHours,
}: {
  openingHours: Record<string, unknown> | null | undefined;
}) {
  const status = isMerchantOpenNow(openingHours ?? null);

  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-1">
      <p className="text-sm font-bold text-foreground">Opening Hours</p>
      <p className={`text-xs font-bold ${status.open ? "text-emerald-500" : "text-destructive"}`}>
        {status.open ? "Open now" : "Closed now"}
      </p>
      <p className="text-[11px] text-muted-foreground">{status.reason}</p>
    </div>
  );
}
