/**
 * User Behavior Event Handler — tracks user preferences from platform events.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { trackUserBehavior } from "@/lib/ai/user-feedback";

platformBus.on("entity:click", async (event) => {
  const p = event.payload as Record<string, any>;
  await trackUserBehavior({
    userId: p.userId,
    category: p.category || p.subcategory,
    location: p.city,
    action: "click",
  });
});

platformBus.on("order:completed", async (event) => {
  const p = event.payload as Record<string, any>;
  await trackUserBehavior({
    userId: p.userId,
    category: p.category || p.subcategory,
    location: p.city,
    action: "purchase",
  });
});

platformBus.on("search:performed", async (event) => {
  const p = event.payload as Record<string, any>;
  await trackUserBehavior({
    userId: p.userId,
    category: p.category,
    location: p.city,
    action: "search",
  });
});
