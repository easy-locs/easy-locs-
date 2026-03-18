/**
 * Order status bridge — update order status with event tracking.
 */
import { supabase } from "@/integrations/supabase/client";

export async function setOrderStatusWithEvents(params: {
  orderId: string;
  status: string;
  actorType?: "customer" | "merchant" | "driver" | "system";
  notes?: string;
}) {
  const patch: Record<string, any> = { status: params.status };

  if (params.status === "completed" || params.status === "delivered") {
    patch.completed_at = new Date().toISOString();
  }

  const { data, error } = await (supabase as any)
    .from("orders")
    .update(patch)
    .eq("id", params.orderId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
