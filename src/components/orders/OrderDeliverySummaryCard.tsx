export default function OrderDeliverySummaryCard({
  status,
  eta,
  addressText,
}: {
  status?: string | null;
  eta?: string | null;
  addressText?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-2">
      <p className="text-sm font-bold text-foreground">Delivery Summary</p>
      <p className="text-xs text-muted-foreground">
        Status: {status || "pending"}
      </p>
      <p className="text-xs text-muted-foreground">
        ETA: {eta || "25–35 min"}
      </p>
      <p className="text-xs text-muted-foreground">
        Address: {addressText || "Address not selected"}
      </p>
    </div>
  );
}
