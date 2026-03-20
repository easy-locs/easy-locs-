export const SUPPORT_TICKET_TYPES = [
  { key: "order_issue", label: "Order issue" },
  { key: "delivery_issue", label: "Delivery issue" },
  { key: "payment_issue", label: "Payment issue" },
  { key: "refund_issue", label: "Refund issue" },
  { key: "account_issue", label: "Account issue" },
  { key: "merchant_issue", label: "Merchant issue" },
  { key: "driver_issue", label: "Driver issue" },
  { key: "other", label: "Other" },
] as const;

export function getTicketTypeLabel(type?: string | null) {
  return SUPPORT_TICKET_TYPES.find((t) => t.key === type)?.label ?? "Other";
}
