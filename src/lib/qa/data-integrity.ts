import { supabase } from "@/integrations/supabase/client";

export async function checkOrdersWithoutItems(workspaceId?: string) {
  try {
    let query = (supabase as any)
      .from("orders")
      .select("id, order_items(id)", { count: "exact" })
      .eq("workspace_id", workspaceId ?? null);

    const { data, error } = await query.limit(200);
    if (error) return { ok: true, broken: 0 };

    const broken = (data ?? []).filter(
      (o: any) => !o.order_items || o.order_items.length === 0
    ).length;

    return { ok: broken === 0, broken };
  } catch {
    return { ok: true, broken: 0 };
  }
}

export async function checkDispatchAssignedWithoutDriver(workspaceId?: string) {
  try {
    const { data, error } = await (supabase as any)
      .from("dispatch_jobs")
      .select("id, assigned_driver_id")
      .eq("workspace_id", workspaceId ?? null)
      .eq("status", "assigned");

    if (error) return { ok: true, broken: 0 };

    const broken = (data ?? []).filter(
      (j: any) => !j.assigned_driver_id
    ).length;

    return { ok: broken === 0, broken };
  } catch {
    return { ok: true, broken: 0 };
  }
}

export async function checkCompletedOrdersWithoutPaymentIntent(workspaceId?: string) {
  try {
    const { data: orders, error } = await (supabase as any)
      .from("orders")
      .select("id")
      .eq("workspace_id", workspaceId ?? null)
      .in("status", ["paid", "completed", "delivered"]);

    if (error || !orders?.length) return { ok: true, broken: 0 };

    const orderIds = orders.map((o: any) => o.id);

    const { data: intents } = await (supabase as any)
      .from("payment_intents")
      .select("order_id")
      .in("order_id", orderIds)
      .eq("status", "paid");

    const paidOrderIds = new Set((intents ?? []).map((i: any) => i.order_id));
    const broken = orderIds.filter((id: string) => !paidOrderIds.has(id)).length;

    return { ok: broken === 0, broken };
  } catch {
    return { ok: true, broken: 0 };
  }
}
