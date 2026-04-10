/**
 * User Behavior Event Handler — tracks user preferences from platform events.
 */
import { eventBus } from "@/lib/core/event-bus";
import { trackUserBehavior } from "@/lib/ai/user-feedback";

eventBus.on("entity.click", async (p) => {
  await trackUserBehavior({
    userId: p.userId,
    category: p.category || p.subcategory,
    location: p.city,
    action: "click",
  });
});

eventBus.on("order.completed", async (p) => {
  await trackUserBehavior({
    userId: p.userId,
    category: p.category || p.subcategory,
    location: p.city,
    action: "purchase",
  });
});

eventBus.on("search.performed", async (p) => {
  await trackUserBehavior({
    userId: p.userId,
    category: p.category,
    location: p.city,
    action: "search",
  });
});
