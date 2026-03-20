export function getV1CustomerTrackingLabel(status: string | null | undefined) {
  const s = String(status ?? "pending_payment");

  const map: Record<string, string> = {
    pending_payment: "Payment pending",
    paid: "Paid",
    confirmed: "Order confirmed",
    preparing: "Being prepared",
    ready_for_pickup: "Ready",
    driver_search: "Finding driver",
    driver_assigned: "Driver assigned",
    picked_up: "Picked up",
    on_the_way: "On the way",
    delivered: "Delivered",
    completed: "Completed",
    cancelled: "Cancelled",
    refunded: "Refunded",
    disputed: "Under review",
  };

  return map[s] ?? "Processing";
}
