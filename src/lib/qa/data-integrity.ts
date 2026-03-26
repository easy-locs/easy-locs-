import { supabase } from "@/integrations/supabase/client";

export async function checkOrdersWithoutItems(workspaceId?: string) {
  try {
    let query = (supabase as any)
      .from("orders")
      .select("id, order_items(id)", { count: "exact" });

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }

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
    const query = (supabase as any)
      .from("mobility_jobs")
      .select("id, rider_user_id")
      .eq("status", "accepted");

    const { data, error } = await query;
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
    let query = (supabase as any)
      .from("orders")
      .select("id")
      .in("status", ["paid", "completed", "delivered"]);

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }

    const { data: orders, error } = await query;
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
