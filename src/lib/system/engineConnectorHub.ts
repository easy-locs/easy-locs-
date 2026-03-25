import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";
import { assignMatchedDriver } from "@/lib/core/driverMatchingEngine";
import { createOrderEscrow, releaseOrderEscrow, refundOrderEscrow } from "@/lib/core/orderEscrowEngine";
import { moveOrderToNextState } from "@/lib/core/realtimeOrderStateEngine";

type SyncResult = {
  ok: boolean;
  step: string;
  message: string;
};

async function getOrderById(orderId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error) throw error;
  return data as any;
}

export async function syncOrderPaymentToEscrow(orderId: string): Promise<SyncResult> {
  const order = await getOrderById(orderId);
  if (!order) return { ok: false, step: "payment->escrow", message: "Order not found" };

  if (String(order.payment_status ?? "") !== "captured") {
    return { ok: false, step: "payment->escrow", message: "Payment not captured" };
  }

  if (Number(order.escrow_amount ?? 0) > 0) {
    return { ok: true, step: "payment->escrow", message: "Escrow already created" };
  }

  await createOrderEscrow({
    orderId: order.id,
    customerUserId: (order as any).customer_user_id,
    merchantUserId: (order as any).merchant_user_id ?? null,
    amount: Number(order.total_amount ?? 0),
    currency: order.currency ?? "AED",
  });

  return { ok: true, step: "payment->escrow", message: "Escrow created" };
}

export async function syncReadyOrderToDriver(orderId: string): Promise<SyncResult> {
  const order = await getOrderById(orderId);
  if (!order) return { ok: false, step: "ready->driver", message: "Order not found" };

  const status = String(order.status ?? "");
  if (!["ready_for_pickup", "driver_search"].includes(status)) {
    return { ok: false, step: "ready->driver", message: `Status ${status} not dispatchable` };
  }

  const result = await assignMatchedDriver({
    orderId: order.id,
    pickupLat: (order as any).pickup_lat ?? null,
    pickupLng: (order as any).pickup_lng ?? null,
    zone: (order as any).pickup_zone ?? null,
  });

  if (!result) {
    return { ok: false, step: "ready->driver", message: "No matching driver found" };
  }

  return { ok: true, step: "ready->driver", message: `Driver ${result.driverId} assigned` };
}

export async function syncCompletedOrderToSettlement(orderId: string): Promise<SyncResult> {
  const order = await getOrderById(orderId);
  if (!order) return { ok: false, step: "completed->settlement", message: "Order not found" };

  if (String(order.status ?? "") !== "completed") {
    return { ok: false, step: "completed->settlement", message: "Order not completed" };
  }

  if (String(order.settlement_status ?? "") === "released") {
    return { ok: true, step: "completed->settlement", message: "Settlement already released" };
  }

  await releaseOrderEscrow({
    orderId: order.id,
    merchantUserId: (order as any).merchant_user_id ?? null,
    driverUserId: (order as any).assigned_driver_user_id ?? null,
    amount: Number(order.total_amount ?? 0),
    currency: order.currency ?? "AED",
  });

  return { ok: true, step: "completed->settlement", message: "Settlement released" };
}

export async function syncRefundedOrder(orderId: string): Promise<SyncResult> {
  const order = await getOrderById(orderId);
  if (!order) return { ok: false, step: "refund-sync", message: "Order not found" };

  if (!["refunded", "disputed"].includes(String(order.status ?? ""))) {
    return { ok: false, step: "refund-sync", message: "Order not refundable state" };
  }

  await refundOrderEscrow({
    orderId: order.id,
    customerUserId: (order as any).customer_user_id,
    amount: Number(order.total_amount ?? 0),
    currency: order.currency ?? "AED",
    reason: (order as any).refund_reason ?? "refund_sync",
  });

  return { ok: true, step: "refund-sync", message: "Refund posted to customer" };
}

export async function runSingleOrderConnector(orderId: string) {
  const results: SyncResult[] = [];

  try {
    results.push(await syncOrderPaymentToEscrow(orderId));
  } catch (e: any) {
    results.push({ ok: false, step: "payment->escrow", message: e.message || "Escrow sync failed" });
  }

  try {
    results.push(await syncReadyOrderToDriver(orderId));
  } catch (e: any) {
    results.push({ ok: false, step: "ready->driver", message: e.message || "Dispatch sync failed" });
  }

  try {
    results.push(await syncCompletedOrderToSettlement(orderId));
  } catch (e: any) {
    results.push({ ok: false, step: "completed->settlement", message: e.message || "Settlement sync failed" });
  }

  return results;
}

let hubInstalled = false;

export function installEngineConnectorHub() {
  if (hubInstalled) return;
  hubInstalled = true;

  platformBus.on("PAYMENT_SUCCESS", async (event) => {
    const payload = event.payload as any;
    if (!payload?.orderId) return;
    await syncOrderPaymentToEscrow(payload.orderId).catch(() => {});
  });

  platformBus.on("ORDER_READY", async (event) => {
    const payload = event.payload as any;
    if (!payload?.orderId) return;
    await syncReadyOrderToDriver(payload.orderId).catch(() => {});
  });

  platformBus.on("ORDER_DELIVERED", async (event) => {
    const payload = event.payload as any;
    if (!payload?.orderId) return;
    await moveOrderToNextState(payload.orderId).catch(() => {});
  });

  platformBus.on("ORDER_COMPLETED", async (event) => {
    const payload = event.payload as any;
    if (!payload?.orderId) return;
    await syncCompletedOrderToSettlement(payload.orderId).catch(() => {});
  });

  platformBus.on("ORDER_REFUNDED", async (event) => {
    const payload = event.payload as any;
    if (!payload?.orderId) return;
    await syncRefundedOrder(payload.orderId).catch(() => {});
  });
}
