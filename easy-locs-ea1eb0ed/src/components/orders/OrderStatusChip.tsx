/**
 * OrderStatusChip — Unified status badge used across customer, merchant, and admin surfaces.
 */
import { getStatusMeta, getPaymentStatusMeta } from "@/lib/orders/order-status";

interface OrderStatusChipProps {
  status: string;
  variant?: "customer" | "merchant" | "admin";
  size?: "sm" | "md";
}

export function OrderStatusChip({ status, variant = "customer", size = "sm" }: OrderStatusChipProps) {
  const meta = getStatusMeta(status);
  const label = variant === "merchant" ? meta.merchantLabel : variant === "admin" ? meta.label : meta.customerLabel;

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full whitespace-nowrap ${
        size === "sm" ? "text-[10px] px-2.5 py-0.5" : "text-xs px-3 py-1"
      }`}
      style={{ color: meta.color, background: meta.bg }}
    >
      <span className="text-[10px]">{meta.icon}</span>
      {label}
    </span>
  );
}

export function PaymentStatusChip({ status, size = "sm" }: { status: string; size?: "sm" | "md" }) {
  const meta = getPaymentStatusMeta(status);
  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full whitespace-nowrap ${
        size === "sm" ? "text-[10px] px-2.5 py-0.5" : "text-xs px-3 py-1"
      }`}
      style={{ color: meta.color, background: meta.bg }}
    >
      {meta.label}
    </span>
  );
}
