/**
 * AI Feedback handler — pipes core events into the feedback signal tracker.
 */
import { eventBus } from "@/lib/core/event-bus";
import { trackFeedbackSignal } from "@/lib/ai/feedback-tracker";

const MAPPINGS: Array<{
  event: string;
  feedbackType: "entity.view" | "entity.click" | "order.created" | "order.completed" | "boost.purchased" | "message.sent" | "favorite.added" | "search.performed" | "cart.abandoned";
  getEntityId: (p: any) => string | undefined;
  getEntityType?: (p: any) => string;
}> = [
  { event: "entity.view", feedbackType: "entity.view", getEntityId: (p) => p.entityId },
  { event: "entity.click", feedbackType: "entity.click", getEntityId: (p) => p.entityId },
  { event: "order.created", feedbackType: "order.created", getEntityId: (p) => p.shopId },
  { event: "order.completed", feedbackType: "order.completed", getEntityId: (p) => p.shopId },
  { event: "boost.purchased", feedbackType: "boost.purchased", getEntityId: (p) => p.shopId },
  { event: "favorite.added", feedbackType: "favorite.added", getEntityId: (p) => p.entityId },
  { event: "cart.abandoned", feedbackType: "cart.abandoned", getEntityId: (p) => p.shopId },
];

for (const mapping of MAPPINGS) {
  eventBus.on(mapping.event, async (p) => {
    const entityId = mapping.getEntityId(p);
    if (!entityId) return;
    await trackFeedbackSignal({
      entityId,
      entityType: mapping.getEntityType?.(p) ?? p.entityType ?? "merchant",
      eventType: mapping.feedbackType,
      userId: p.userId ?? null,
      sessionId: p.sessionId ?? null,
      metadata: p,
    });
  });
}
