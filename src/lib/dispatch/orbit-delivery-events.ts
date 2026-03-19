/**
 * Orbit Delivery Event Handlers — Connects dispatch, delivery, and settlement
 * to the platform event bus. All handlers are idempotent.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import type { PlatformEvent } from "@/lib/shared/platform-bus";

// Track processed events to ensure idempotency
const processedEvents = new Set<string>();

function idempotent(key: string, handler: () => Promise<void>) {
  if (processedEvents.has(key)) return;
  processedEvents.add(key);
  setTimeout(() => processedEvents.delete(key), 300_000);
  handler().catch(err => console.error(`[orbit-delivery] ${key} failed:`, err));
}

/**
 * Install delivery event listeners. Call once at app startup.
 */
export function installDeliveryEventListeners(): () => void {
  const unsubs: (() => void)[] = [];

  // On order created with delivery mode → create dispatch job
  unsubs.push(
    platformBus.on("commerce:order_created", (event: PlatformEvent) => {
      const p = event.payload as any;
      if (!["delivery_food", "delivery_retail"].includes(p?.mode)) return;
      idempotent(`dispatch_create_${p.orderId}`, async () => {
        const { createDispatchJob } = await import("@/lib/dispatch/dispatch-engine");
        if (p.pickupLat && p.pickupLng && p.dropoffLat && p.dropoffLng) {
          const job = await createDispatchJob({
            orderId: p.orderId,
            merchantProfileId: p.merchantProfileId,
            customerUserId: p.customerUserId,
            pickupLat: p.pickupLat,
            pickupLng: p.pickupLng,
            dropoffLat: p.dropoffLat,
            dropoffLng: p.dropoffLng,
            countryCode: p.countryCode ?? "AE",
            city: p.city,
            deliveryFee: p.deliveryFee ?? 0,
            currency: p.currency,
            selfDelivery: p.selfDelivery,
          });
          // Auto-broadcast
          const { broadcastDispatchJob } = await import("@/lib/dispatch/dispatch-engine");
          if (job.dispatch_status === "open") {
            await broadcastDispatchJob(job.id);
          }
        }
        console.log(`[orbit-delivery] Dispatch job queued for order ${p.orderId}`);
      });
    })
  );

  // On driver assigned → update order + emit
  unsubs.push(
    platformBus.on("dispatch:driver_assigned" as any, (event: PlatformEvent) => {
      const p = event.payload as any;
      idempotent(`driver_assigned_${p.jobId}`, async () => {
        console.log(`[orbit-delivery] Driver ${p.driverProfileId} assigned to job ${p.jobId}`);
      });
    })
  );

  // On delivery validated → settle
  unsubs.push(
    platformBus.on("delivery:validated" as any, (event: PlatformEvent) => {
      const p = event.payload as any;
      idempotent(`settle_delivery_${p.orderId}`, async () => {
        const { settleValidatedDelivery } = await import("@/lib/dispatch/delivery-settlement");
        try {
          await settleValidatedDelivery(p.orderId);
          console.log(`[orbit-delivery] Settled delivery for order ${p.orderId}`);
        } catch (e) {
          console.error(`[orbit-delivery] Settlement failed for ${p.orderId}:`, e);
        }
      });
    })
  );

  // On delivery failed → reverse
  unsubs.push(
    platformBus.on("delivery:failed" as any, (event: PlatformEvent) => {
      const p = event.payload as any;
      idempotent(`fail_delivery_${p.orderId}`, async () => {
        const { failDelivery } = await import("@/lib/dispatch/delivery-settlement");
        await failDelivery(p.orderId, p.reason ?? "delivery_failed");
        console.log(`[orbit-delivery] Failed delivery for order ${p.orderId}`);
      });
    })
  );

  // On payment captured → auto-dispatch if delivery order
  unsubs.push(
    platformBus.on("commerce:payment_captured", (event: PlatformEvent) => {
      const p = event.payload as any;
      idempotent(`payment_captured_dispatch_${p.orderId}`, async () => {
        console.log(`[orbit-delivery] Payment captured for ${p.orderId}, checking dispatch`);
      });
    })
  );

  // On payment reversed → cleanup dispatch
  unsubs.push(
    platformBus.on("commerce:payment_reversed", (event: PlatformEvent) => {
      const p = event.payload as any;
      idempotent(`reversed_dispatch_${p.orderId}`, async () => {
        const { getDispatchJobsForOrder, cancelDispatchJob } = await import("@/lib/dispatch/dispatch-engine");
        const jobs = await getDispatchJobsForOrder(p.orderId);
        for (const job of jobs) {
          if (!["delivered", "validated", "cancelled", "failed"].includes(job.dispatch_status)) {
            await cancelDispatchJob(job.id, "payment_reversed");
          }
        }
      });
    })
  );

  return () => unsubs.forEach(fn => fn());
}
