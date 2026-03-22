import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";

export async function emitOrderCreated(orderId: string) {
  const { data, error } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Order not found");

  platformBus.emit(
    "ORDER_CREATED",
    {
      orderId: data.id,
      merchantId: (data as any).merchant_id ?? null,
      customerUserId: (data as any).customer_user_id ?? null,
      amount: Number((data as any).total_amount ?? 0),
      currency: (data as any).currency ?? "AED",
    },
    "system"
  );

  return true;
}

export async function emitOrderReady(orderId: string) {
  const { data, error } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Order not found");

  platformBus.emit(
    "ORDER_READY",
    {
      orderId: data.id,
      merchantId: (data as any).merchant_id ?? null,
      city: (data as any).city ?? "Dubai",
      pickupLat: (data as any).pickup_lat ?? null,
      pickupLng: (data as any).pickup_lng ?? null,
      zone: (data as any).pickup_zone ?? null,
    },
    "system"
  );

  return true;
}

export async function emitOrderCompleted(orderId: string) {
  await platformBus.emit(
    "ORDER_COMPLETED",
    { orderId },
    { source: "orderEventOrchestrator:emitOrderCompleted" }
  );

  return true;
}

export async function emitOrderRefunded(orderId: string) {
  await platformBus.emit(
    "ORDER_REFUNDED",
    { orderId },
    { source: "orderEventOrchestrator:emitOrderRefunded" }
  );

  return true;
}
