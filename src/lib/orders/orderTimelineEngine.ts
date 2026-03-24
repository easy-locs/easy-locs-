import { supabase } from "@/integrations/supabase/client";

export interface OrderTimelineItem {
  key: string;
  label: string;
  description?: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft created",
  pending_payment: "Waiting for payment",
  paid: "Payment received",
  confirmed: "Merchant confirmed order",
  preparing: "Merchant is preparing",
  ready_for_pickup: "Ready for pickup",
  driver_search: "Searching for driver",
  driver_assigned: "Driver assigned",
  picked_up: "Order picked up",
  on_the_way: "Order on the way",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  disputed: "Disputed",
};

export async function getOrderTimeline(orderId: string): Promise<OrderTimelineItem[]> {
  const [{ data: order, error: orderErr }, { data: events, error: eventErr }] =
    await Promise.all([
      supabase.from("orders").select("*").eq("id", orderId).maybeSingle(),
      (supabase as any)
        .from("activity_logs")
        .select("*")
        .eq("entity_id", orderId)
        .order("created_at", { ascending: true })
        .limit(200),
    ]);

  if (orderErr) throw orderErr;
  if (eventErr) throw eventErr;

  const rows: OrderTimelineItem[] = [];

  if (order) {
    rows.push({
      key: "order_created",
      label: "Order created",
      description: (order as any).notes ?? null,
      createdAt: (order as any).created_at,
    });
  }

  for (const row of events ?? []) {
    const eventType = String((row as any).event_type ?? "");
    const createdAt = String((row as any).created_at ?? new Date().toISOString());

    if (eventType.includes("payment")) {
      rows.push({ key: eventType, label: "Payment event", description: eventType, createdAt });
      continue;
    }
    if (eventType.includes("mission")) {
      rows.push({ key: eventType, label: "Delivery event", description: eventType, createdAt });
      continue;
    }
    if (eventType.includes("order")) {
      rows.push({ key: eventType, label: "Order event", description: eventType, createdAt });
    }
  }

  const orderStatus = String((order as any)?.status ?? "");
  if (orderStatus) {
    rows.push({
      key: `status_${orderStatus}`,
      label: STATUS_LABELS[orderStatus] ?? orderStatus,
      description: "Latest order status",
      createdAt: String((order as any)?.updated_at ?? (order as any)?.created_at ?? new Date().toISOString()),
    });
  }

  return rows.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}
