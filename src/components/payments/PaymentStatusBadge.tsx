type PaymentStatusBadgeProps = {
  status?: string | null;
};

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const value = String(status ?? "unpaid");

  const cls =
    value === "captured" || value === "paid"
      ? "bg-emerald-500/10 text-emerald-500"
      : value === "pending"
        ? "bg-amber-500/10 text-amber-500"
        : value === "refunded"
          ? "bg-destructive/10 text-destructive"
          : "bg-muted text-foreground";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${cls}`}>
      {value}
    </span>
  );
}
