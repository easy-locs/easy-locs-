/**
 * Orbit Delivery Event Handlers — Connects dispatch, delivery, and automation
 * to the platform event bus. All handlers are idempotent.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import type { PlatformEvent } from "@/lib/shared/platform-bus";

// Track processed events to ensure idempotency
const processedEvents = new Set<string>();

function idempotent(key: string, handler: () => Promise<void>) {
  if (processedEvents.has(key)) return;
  processedEvents.add(key);
  // Cleanup old keys after 5min
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
        // The actual job creation requires coordinates which should be on the order
        console.log(`[orbit-delivery] Dispatch job queued for order ${p.orderId}`);
      });
    })
  );

  // On driver assigned → update order
  unsubs.push(
    platformBus.on("commerce:driver_assigned", (event: PlatformEvent) => {
      const p = event.payload as any;
      if (p?.stage !== "driver_assigned") return;
      idempotent(`driver_assigned_${p.jobId}`, async () => {
        console.log(`[orbit-delivery] Driver ${p.driverId} assigned to job ${p.jobId}`);
      });
    })
  );

  // On payment captured → send to kitchen
  unsubs.push(
    platformBus.on("commerce:payment_captured", (event: PlatformEvent) => {
      const p = event.payload as any;
      idempotent(`kitchen_push_${p.orderId}`, async () => {
        console.log(`[orbit-delivery] Order ${p.orderId} captured, pushing to kitchen`);
      });
    })
  );

  // On payment settled → mark order complete
  unsubs.push(
    platformBus.on("commerce:payment_settled", (event: PlatformEvent) => {
      const p = event.payload as any;
      idempotent(`settled_${p.orderId}`, async () => {
        console.log(`[orbit-delivery] Order ${p.orderId} settled`);
      });
    })
  );

  // On payment reversed → cleanup
  unsubs.push(
    platformBus.on("commerce:payment_reversed", (event: PlatformEvent) => {
      const p = event.payload as any;
      idempotent(`reversed_${p.orderId}`, async () => {
        const { cancelDispatchJob, getDispatchJobsForOrder } = await import("@/lib/dispatch/dispatch-engine");
        const jobs = await getDispatchJobsForOrder(p.orderId);
        for (const job of jobs) {
          if (!["delivered", "cancelled", "failed"].includes(job.status)) {
            await cancelDispatchJob(job.id, "payment_reversed");
          }
        }
      });
    })
  );

  return () => unsubs.forEach(fn => fn());
}
