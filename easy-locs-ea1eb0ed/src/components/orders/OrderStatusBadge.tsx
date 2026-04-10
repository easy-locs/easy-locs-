import { getStatusMeta } from "@/lib/orders/order-status";

export default function OrderStatusBadge({ status }: { status: string }) {
  const meta = getStatusMeta(status);

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.color}`}>
      {meta.icon}
      {meta.label}
    </span>
  );
}
