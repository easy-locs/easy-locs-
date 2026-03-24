/**
 * Business handler — reacts to events for ranking/CRM side effects.
 */
import { eventBus } from "@/lib/core/event-bus";

eventBus.on("boost.purchased", async (p) => {
  console.log("[ranking] boost impact", p.shopId);
});

eventBus.on("order.created", async (p) => {
  console.log("[ranking] conversion boost", p.shopId);
});

eventBus.on("cart.abandoned", async (p) => {
  console.log("[crm] abandoned cart", p.userId);
});
