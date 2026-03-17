/**
 * V4 Delivery Bridge — Connects wallet/order completion to delivery creation.
 * 
 * Critical chain: Chat → Payment → Wallet → Delivery
 * 
 * DB trigger handles auto-creation for storefront_orders.
 * This bridge handles the client-side bus event propagation
 * and manual delivery creation for wallet-only transactions.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { supabase } from "@/integrations/supabase/client";

/**
 * Install V4 delivery bridge reactions.
 * Called once at app startup.
 */
export function installDeliveryBridge(): () => void {
  const unsubs: (() => void)[] = [];

  // ── Order paid + requires delivery → emit delivery event ──
  unsubs.push(
    platformBus.on("storefront:order_paid", async (event) => {
      const { orderId, shopId, requiresDelivery } = event.payload as any;
      if (!requiresDelivery) return;

      // The DB trigger handles actual job creation.
      // We emit the bus event for UI refresh.
      platformBus.emit("storefront:delivery_dispatched", {
        orderId, shopId, source: "auto_bridge",
      }, "marketplace", { userId: event.userId, orgId: event.orgId });
    })
  );

  // ── Wallet payment completed with order context → ensure delivery ──
  unsubs.push(
    platformBus.on("wallet:payment_completed", async (event) => {
      const { referenceType, referenceId, requiresDelivery } = event.payload as any;
      if (referenceType !== "order" || !requiresDelivery || !referenceId) return;

      try {
        // Check if delivery job already exists (from DB trigger)
        const { data: order } = await supabase
          .from("storefront_orders" as any)
          .select("id, delivery_job_id, requires_delivery, status")
          .eq("id", referenceId)
          .maybeSingle();

        if (order && (order as any).delivery_job_id) {
          // Already created by trigger — just refresh UI
          platformBus.emit("storefront:delivery_dispatched", {
            orderId: referenceId,
            jobId: (order as any).delivery_job_id,
            source: "trigger_confirmed",
          }, "marketplace", { userId: event.userId });
          return;
        }

        // Fallback: create via edge function if trigger didn't fire
        if (order && !(order as any).delivery_job_id) {
          const { data, error } = await supabase.functions.invoke("dispatch-delivery", {
            body: {
              action: "create_job",
              org_id: event.orgId,
              order_id: referenceId,
              pickup_address: "Shop pickup",
              dropoff_address: "Customer address",
              package_description: `Order #${referenceId.slice(0, 8)}`,
              weight_kg: 1,
              priority: "standard",
              delivery_fee: 0,
              currency: "EUR",
            },
          });

          if (!error && data?.job) {
            platformBus.emit("storefront:delivery_dispatched", {
              orderId: referenceId,
              jobId: data.job.id,
              source: "bridge_fallback",
            }, "marketplace", { userId: event.userId });
          }
        }
      } catch (err) {
        console.error("[v4-delivery-bridge] Error creating delivery:", err);
      }
    })
  );

  // ── Order completed → trigger delivery module refresh ──
  unsubs.push(
    platformBus.on("storefront:order_completed", (event) => {
      const { orderId, shopId } = event.payload as any;
      // Invalidate delivery queries
      const getQueryClient = () => (window as any).__REACT_QUERY_CLIENT__;
      const qc = getQueryClient();
      if (qc) {
        qc.invalidateQueries({ queryKey: ["delivery-jobs"] });
        qc.invalidateQueries({ queryKey: ["seller-delivery"] });
      }
    })
  );

  return () => unsubs.forEach(fn => fn());
}
