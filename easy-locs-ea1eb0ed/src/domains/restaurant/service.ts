import type { RestaurantUseCases, FoodOrderStatus, FoodOrder } from "./ports";
import { restaurantOrderAdapter } from "./adapters/supabase.adapter";
import { restaurantEvents } from "./events";
import { createDomainLogger } from "../shared/observability";
import { requireAuth, type SecurityContext } from "../shared/security-guards";
import { createActionGuard, acquireSinglePath } from "@/lib/guards/action-guard";
import { platformBus } from "@/lib/shared/platform-bus";

interface FoodStatusMeta {
  label: string;
  merchantLabel: string;
  color: string;
  bg: string;
}

const FOOD_STATUS_META: Record<string, FoodStatusMeta> = {
  pending:          { label: "New Order",     merchantLabel: "New Order",       color: "hsl(30 90% 55%)",  bg: "hsl(30 90% 55% / 0.12)" },
  accepted:         { label: "Accepted",      merchantLabel: "Accepted",        color: "hsl(200 80% 55%)", bg: "hsl(200 80% 55% / 0.12)" },
  preparing:        { label: "Preparing",     merchantLabel: "Preparing",       color: "hsl(45 90% 50%)",  bg: "hsl(45 90% 50% / 0.12)" },
  ready_for_pickup: { label: "Ready",         merchantLabel: "Ready for pickup",color: "hsl(160 70% 45%)", bg: "hsl(160 70% 45% / 0.12)" },
  dispatching:      { label: "Dispatching",   merchantLabel: "Finding rider",   color: "hsl(270 70% 60%)", bg: "hsl(270 70% 60% / 0.12)" },
  in_delivery:      { label: "In delivery",   merchantLabel: "Rider en route",  color: "hsl(200 90% 45%)", bg: "hsl(200 90% 45% / 0.12)" },
  delivered:        { label: "Delivered",      merchantLabel: "Delivered",       color: "hsl(142 70% 45%)", bg: "hsl(142 70% 45% / 0.12)" },
  cancelled:        { label: "Cancelled",     merchantLabel: "Cancelled",       color: "hsl(0 70% 50%)",   bg: "hsl(0 70% 50% / 0.12)" },
};

const FOOD_MERCHANT_ACTIONS: Record<string, { label: string; nextStatus: string }[]> = {
  pending:          [{ label: "Accept", nextStatus: "accepted" }, { label: "Reject", nextStatus: "cancelled" }],
  accepted:         [{ label: "Start Preparing", nextStatus: "preparing" }],
  preparing:        [{ label: "Mark Ready", nextStatus: "ready_for_pickup" }],
  ready_for_pickup: [],
  dispatching:      [],
  in_delivery:      [],
  delivered:        [],
  cancelled:        [],
};

export function getFoodStatusMeta(status: string): FoodStatusMeta {
  return FOOD_STATUS_META[status] ?? { label: status, merchantLabel: status, color: "hsl(var(--muted-foreground))", bg: "hsl(var(--muted))" };
}

export function getFoodNextActions(status: string): { label: string; nextStatus: string }[] {
  return FOOD_MERCHANT_ACTIONS[status] ?? [];
}

const log = createDomainLogger("restaurant");

function assertOrderOwner(order: FoodOrder, userId: string) {
  if (order.sellerId !== userId) {
    throw new Error("Forbidden: you do not own this order");
  }
}

async function assertShopOwner(shopId: string, userId: string) {
  const { db } = await import("@/services/db");
  const { data } = await db
    .from("storefront_pages")
    .select("user_id")
    .eq("id", shopId)
    .maybeSingle();
  if (!data || data.user_id !== userId) {
    throw new Error("Forbidden: you do not own this shop");
  }
}

const orderGuard = createActionGuard("restaurant.order");

const FOOD_ORDER_TRANSITIONS: Record<string, FoodOrderStatus[]> = {
  pending: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready_for_pickup"],
  ready_for_pickup: ["dispatching"],
  dispatching: ["in_delivery"],
  in_delivery: ["delivered"],
};
const TERMINAL_STATES = new Set<FoodOrderStatus>(["delivered", "cancelled"]);

function canTransition(from: string, to: string): boolean {
  if (TERMINAL_STATES.has(from as FoodOrderStatus)) return false;
  return FOOD_ORDER_TRANSITIONS[from]?.includes(to as FoodOrderStatus) ?? false;
}

export function createRestaurantService(ctx: SecurityContext | null): RestaurantUseCases {
  return {
    async acceptOrder(orderId: string) {
      requireAuth(ctx);
      const userId = ctx.userId;

      const flowKey = `food-order:${orderId}`;
      const release = acquireSinglePath(flowKey);
      if (!release) return { ok: false, error: "order_action_in_progress" };

      try {
        const result = await orderGuard.execute(
          async (actionCtx) => {
            const order = await restaurantOrderAdapter.findById(orderId);
            if (!order) throw new Error("Order not found");
            assertOrderOwner(order, userId);
            if (!canTransition(order.status, "accepted")) {
              throw new Error(`Cannot accept: order is '${order.status}'`);
            }

            const maxPrepTime = Math.max(
              ...order.items.map((i) => i.prepTimeMinutes ?? 15),
              15
            );

            const updated = await restaurantOrderAdapter.updateStatus(orderId, "accepted", {
              estimated_prep_minutes: maxPrepTime,
              accepted_at: new Date().toISOString(),
            }, order.status as FoodOrderStatus);

            if (!updated) throw new Error("Status already changed by another action");

            updated.estimatedPrepMinutes = maxPrepTime;
            restaurantEvents.orderAccepted(updated);

            log.info("order_accepted", {
              orderId,
              estimatedPrepMinutes: maxPrepTime,
              correlationId: actionCtx.correlationId,
            });

            return updated;
          },
          { requestId: `accept_${orderId}`, metadata: { orderId } }
        );

        if (result.deduplicated) return { ok: true, data: result.data! };
        if (!result.ok) return { ok: false, error: result.error ?? "Unknown error" };
        return { ok: true, data: result.data! };
      } finally {
        release();
      }
    },

    async rejectOrder(orderId: string, reason: string) {
      requireAuth(ctx);
      const userId = ctx.userId;

      const flowKey = `food-order:${orderId}`;
      const release = acquireSinglePath(flowKey);
      if (!release) return { ok: false, error: "order_action_in_progress" };

      try {
        const result = await orderGuard.execute(
          async (actionCtx) => {
            const order = await restaurantOrderAdapter.findById(orderId);
            if (!order) throw new Error("Order not found");
            assertOrderOwner(order, userId);
            if (!canTransition(order.status, "cancelled")) {
              throw new Error(`Cannot reject: order is '${order.status}'`);
            }

            const cancelled = await restaurantOrderAdapter.updateStatus(orderId, "cancelled", {
              cancelled_reason: reason,
              cancelled_at: new Date().toISOString(),
            }, order.status as FoodOrderStatus);

            if (!cancelled) throw new Error("Status already changed by another action");

            restaurantEvents.orderCancelled(orderId, reason, {
              buyerId: order.buyerId,
              sellerId: order.sellerId,
              shopId: order.shopId,
            });
            log.info("order_rejected", {
              orderId,
              reason,
              correlationId: actionCtx.correlationId,
            });
          },
          { requestId: `reject_${orderId}`, metadata: { orderId, reason } }
        );

        if (!result.ok) return { ok: false, error: result.error ?? "Unknown error" };
        return { ok: true, data: undefined };
      } finally {
        release();
      }
    },

    async startPreparing(orderId: string) {
      requireAuth(ctx);
      const userId = ctx.userId;

      const flowKey = `food-order:${orderId}`;
      const release = acquireSinglePath(flowKey);
      if (!release) return { ok: false, error: "order_action_in_progress" };

      try {
        const result = await orderGuard.execute(
          async (actionCtx) => {
            const order = await restaurantOrderAdapter.findById(orderId);
            if (!order) throw new Error("Order not found");
            assertOrderOwner(order, userId);
            if (!canTransition(order.status, "preparing")) {
              throw new Error(`Cannot start preparing: order is '${order.status}'`);
            }

            const updated = await restaurantOrderAdapter.updateStatus(orderId, "preparing", {
              preparing_started_at: new Date().toISOString(),
            }, order.status as FoodOrderStatus);

            if (!updated) throw new Error("Status already changed by another action");

            restaurantEvents.orderPreparing(updated);
            log.info("order_preparing", {
              orderId,
              correlationId: actionCtx.correlationId,
            });

            return updated;
          },
          { requestId: `prepare_${orderId}`, metadata: { orderId } }
        );

        if (result.deduplicated) return { ok: true, data: result.data! };
        if (!result.ok) return { ok: false, error: result.error ?? "Unknown error" };
        return { ok: true, data: result.data! };
      } finally {
        release();
      }
    },

    async markReady(orderId: string) {
      requireAuth(ctx);
      const userId = ctx.userId;

      const flowKey = `food-order:${orderId}`;
      const release = acquireSinglePath(flowKey);
      if (!release) return { ok: false, error: "order_action_in_progress" };

      try {
        const result = await orderGuard.execute(
          async (actionCtx) => {
            const order = await restaurantOrderAdapter.findById(orderId);
            if (!order) throw new Error("Order not found");
            assertOrderOwner(order, userId);
            if (!canTransition(order.status, "ready_for_pickup")) {
              throw new Error(`Cannot mark ready: order is '${order.status}'`);
            }

            const updated = await restaurantOrderAdapter.updateStatus(orderId, "ready_for_pickup", {
              ready_at: new Date().toISOString(),
            }, order.status as FoodOrderStatus);

            if (!updated) throw new Error("Status already changed by another action");

            if (updated) {
              restaurantEvents.orderReady(updated);

              platformBus.emit("ORDER_READY", {
                orderId: updated.id,
                merchantId: updated.sellerId,
                shopId: updated.shopId,
                pickupLat: updated.shopLat ?? 0,
                pickupLng: updated.shopLng ?? 0,
              }, "restaurant");

              if (updated.deliveryAddress) {
                platformBus.emit("delivery:requested", {
                  orderId: updated.id,
                  shopId: updated.shopId,
                  sellerId: updated.sellerId,
                  pickupLat: updated.shopLat ?? 0,
                  pickupLng: updated.shopLng ?? 0,
                  dropoffAddress: updated.deliveryAddress,
                  dropoffLat: updated.deliveryLat ?? 0,
                  dropoffLng: updated.deliveryLng ?? 0,
                  mode: "food",
                }, "restaurant");

                try {
                  const { db: supaDb } = await import("@/services/db");
                  const { data: dispatchResult } = await supaDb.functions.invoke("dispatch-delivery", {
                    body: {
                      action: "create_job",
                      order_id: updated.id,
                      job_type: "food",
                      pickup_lat: updated.shopLat ?? 0,
                      pickup_lng: updated.shopLng ?? 0,
                      pickup_address: "Restaurant pickup",
                      dropoff_lat: updated.deliveryLat ?? 0,
                      dropoff_lng: updated.deliveryLng ?? 0,
                      dropoff_address: updated.deliveryAddress ?? "",
                      delivery_fee: updated.deliveryFee ?? 0,
                      currency: updated.currency ?? "AED",
                      package_description: `Food order #${updated.id.slice(0, 8)}`,
                      priority: "standard",
                      booking_mode: "now",
                    },
                  });

                  const jobId = dispatchResult?.job?.id ?? dispatchResult?.job_id ?? dispatchResult?.id;
                  if (jobId) {
                    const dispatched = await restaurantOrderAdapter.updateStatus(updated.id, "dispatching", {
                      delivery_job_id: jobId,
                      dispatched_at: new Date().toISOString(),
                    }, "ready_for_pickup");
                    if (dispatched) {
                      restaurantEvents.orderDispatched(dispatched);
                    }
                    log.info("dispatch_created", { orderId: updated.id, jobId });
                  }
                } catch (dispatchErr) {
                  log.warn("dispatch_creation_failed", {
                    orderId: updated.id,
                    error: dispatchErr instanceof Error ? dispatchErr.message : String(dispatchErr),
                  });
                }
              }
            }

            log.info("order_ready", {
              orderId,
              correlationId: actionCtx.correlationId,
            });

            return updated!;
          },
          { requestId: `ready_${orderId}`, metadata: { orderId } }
        );

        if (result.deduplicated) return { ok: true, data: result.data! };
        if (!result.ok) return { ok: false, error: result.error ?? "Unknown error" };
        return { ok: true, data: result.data! };
      } finally {
        release();
      }
    },

    async getActiveOrders(shopId: string) {
      requireAuth(ctx);
      await assertShopOwner(shopId, ctx.userId);
      try {
        const orders = await restaurantOrderAdapter.findActiveByShop(shopId);
        return { ok: true, data: orders };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async getDailyStats(shopId: string) {
      requireAuth(ctx);
      await assertShopOwner(shopId, ctx.userId);
      try {
        const stats = await restaurantOrderAdapter.getDailyStats(shopId);
        return { ok: true, data: stats };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}

export function installFoodOrderReactions() {
  const unsubs: (() => void)[] = [];

  unsubs.push(
    platformBus.on("delivery:completed", async (event) => {
      const payload = event.payload as Record<string, unknown>;
      const orderId = (payload?.orderId ?? payload?.order_id) as string | undefined;
      if (!orderId) return;
      try {
        const order = await restaurantOrderAdapter.findById(orderId);
        if (!order) return;
        if (order.status === "in_delivery" || order.status === "dispatching") {
          await restaurantOrderAdapter.updateStatus(orderId, "delivered", {
            delivered_at: new Date().toISOString(),
          }, order.status as FoodOrderStatus);
          restaurantEvents.orderDelivered({ ...order, status: "delivered" as const });
          log.info("order_delivered_via_delivery", { orderId });
        }
      } catch (err) {
        log.error("delivery_completion_handler_failed", err instanceof Error ? err : new Error(String(err)));
      }
    })
  );

  unsubs.push(
    platformBus.on("dispatch:driver_assigned", async (event) => {
      const payload = event.payload as Record<string, unknown>;
      const orderId = (payload?.orderId ?? payload?.order_id) as string | undefined;
      const jobId = (payload?.jobId ?? payload?.job_id) as string | undefined;
      if (!orderId) return;
      try {
        const order = await restaurantOrderAdapter.findById(orderId);
        if (!order) return;
        if (order.status === "ready_for_pickup" || order.status === "dispatching") {
          const nextStatus = order.status === "ready_for_pickup" ? "dispatching" as const : "in_delivery" as const;
          const updated = await restaurantOrderAdapter.updateStatus(orderId, nextStatus, {
            delivery_job_id: jobId,
            ...(nextStatus === "dispatching" ? { dispatching_at: new Date().toISOString() } : { in_delivery_at: new Date().toISOString() }),
          }, order.status as FoodOrderStatus);
          if (updated && nextStatus === "dispatching") {
            restaurantEvents.orderDispatched(updated);
          }
          log.info("dispatch_driver_assigned", { orderId, nextStatus, jobId });
        }
      } catch (err) {
        log.error("dispatch_handler_failed", err instanceof Error ? err : new Error(String(err)));
      }
    })
  );

  unsubs.push(
    platformBus.on("delivery:status_updated", async (event) => {
      const payload = event.payload as Record<string, unknown>;
      const orderId = (payload?.orderId ?? payload?.order_id) as string | undefined;
      const status = (payload?.status ?? payload?.delivery_status) as string | undefined;
      if (!orderId || !status) return;
      try {
        const order = await restaurantOrderAdapter.findById(orderId);
        if (!order) return;
        if (status === "in_progress" && order.status === "dispatching") {
          await restaurantOrderAdapter.updateStatus(orderId, "in_delivery", {
            in_delivery_at: new Date().toISOString(),
          }, "dispatching");
          log.info("order_in_delivery_via_status", { orderId });
        }
      } catch (err) {
        log.error("delivery_status_handler_failed", err instanceof Error ? err : new Error(String(err)));
      }
    })
  );

  unsubs.push(
    platformBus.on("delivery:pickup_completed", async (event) => {
      const payload = event.payload as Record<string, unknown>;
      const orderId = (payload?.orderId ?? payload?.order_id) as string | undefined;
      if (!orderId) return;
      try {
        const order = await restaurantOrderAdapter.findById(orderId);
        if (!order) return;
        if (order.status === "dispatching") {
          await restaurantOrderAdapter.updateStatus(orderId, "in_delivery", {
            in_delivery_at: new Date().toISOString(),
          }, "dispatching");
          log.info("order_in_delivery", { orderId });
        }
      } catch (err) {
        log.error("pickup_completed_handler_failed", err instanceof Error ? err : new Error(String(err)));
      }
    })
  );

  return () => unsubs.forEach((u) => u());
}
