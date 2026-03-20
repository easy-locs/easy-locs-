import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/orchestration/platformBus";

const MERCHANT_NEXT: Record<string, string[]> = {
  paid: ["confirmed"],
  confirmed: ["preparing"],
  preparing: ["ready_for_pickup"],
  ready_for_pickup: ["completed", "picked_up", "driver_search"],
  picked_up: ["on_the_way"],
  on_the_way: ["delivered"],
  delivered: ["completed"],
};

export async function getMerchantV1Orders(merchantId: string) {
  const { data, error } = await (supabase as any)
    .from("orders")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as any[];
}

export function getMerchantNextStatuses(currentStatus: string) {
  return MERCHANT_NEXT[currentStatus] ?? [];
}

export async function advanceMerchantOrderStatus(params: {
  orderId: string;
  currentStatus: string;
  nextStatus: string;
}) {
  const allowed = getMerchantNextStatuses(params.currentStatus);
  if (!allowed.includes(params.nextStatus)) {
    throw new Error(`Invalid transition from ${params.currentStatus} to ${params.nextStatus}`);
  }

  const { error } = await (supabase as any)
    .from("orders")
    .update({
      status: params.nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.orderId);

  if (error) throw error;

  if (params.nextStatus === "confirmed") {
    await platformBus.emit(
      "ORDER_CONFIRMED",
      { orderId: params.orderId },
      { source: "merchantOrderFlow:advanceMerchantOrderStatus" }
    );
  }

  if (params.nextStatus === "ready_for_pickup") {
    await platformBus.emit(
      "ORDER_READY",
      { orderId: params.orderId, city: "Dubai" },
      { source: "merchantOrderFlow:advanceMerchantOrderStatus" }
    );
  }

  if (params.nextStatus === "completed") {
    await platformBus.emit(
      "ORDER_DELIVERED",
      { orderId: params.orderId },
      { source: "merchantOrderFlow:advanceMerchantOrderStatus" }
    );
  }

  return true;
}
