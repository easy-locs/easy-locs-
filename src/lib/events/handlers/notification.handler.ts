/**
 * Notification handler — listens to core events and dispatches notifications.
 */
import { eventBus } from "@/lib/core/event-bus";
import { supabase } from "@/integrations/supabase/client";

async function sendNotification(input: {
  user_id: string;
  title: string;
  body: string;
  type: string;
  metadata?: Record<string, any>;
}) {
  try {
    await (supabase as any).from("app_notifications").insert({
      id: crypto.randomUUID(),
      user_id: input.user_id,
      orbitId: input.user_id,
      title: input.title,
      body: input.body,
      type: input.type,
      metadata: input.metadata ?? null,
      read: false,
    });
    console.log("[notification] sent", input.type, input.user_id);
  } catch (e) {
    console.error("[notification] send error", e);
  }
}

// Order events
eventBus.on("order.created", async (p) => {
  if (!p.userId) return;
  await sendNotification({
    user_id: p.userId,
    title: "Order confirmed",
    body: `Order #${(p.orderId as string)?.slice(0, 8) ?? ""} is confirmed`,
    type: "order",
    metadata: { orderId: p.orderId, shopId: p.shopId },
  });
});

eventBus.on("order.completed", async (p) => {
  if (!p.userId) return;
  await sendNotification({
    user_id: p.userId,
    title: "Order delivered",
    body: "Your order has been delivered!",
    type: "order",
    metadata: { orderId: p.orderId },
  });
});

// Messaging events
eventBus.on("message.sent", async (p) => {
  if (!p.receiverId) return;
  await sendNotification({
    user_id: p.receiverId,
    title: "New message",
    body: (p.preview as string) || "You received a message",
    type: "chat",
    metadata: { senderId: p.senderId },
  });
});

// Wallet events
eventBus.on("wallet.updated", async (p) => {
  if (!p.userId) return;
  await sendNotification({
    user_id: p.userId,
    title: "Wallet updated",
    body: `${p.amount > 0 ? "+" : ""}${p.amount} ${p.currency ?? "AED"}`,
    type: "wallet",
    metadata: { amount: p.amount },
  });
});

// Boost events
eventBus.on("boost.purchased", async (p) => {
  if (!p.userId) return;
  await sendNotification({
    user_id: p.userId,
    title: "Boost activated",
    body: "Your shop is now boosted!",
    type: "boost",
    metadata: { shopId: p.shopId },
  });
});

// Support / SAV events
eventBus.on("support.ticket_created", async (p) => {
  console.log("[notification] support ticket created", p.ticketId, p.issueType);
});

eventBus.on("support.ticket_escalated", async (p) => {
  console.log("[notification] support ticket ESCALATED", p.ticketId, p.reason);
});

// Delivery events
eventBus.on("delivery.started", async (p) => {
  if (!p.userId) return;
  await sendNotification({
    user_id: p.userId,
    title: "Delivery on the way",
    body: `Your driver ${p.driverName ?? ""} is on the way${p.etaMin ? ` — ETA ~${p.etaMin} min` : ""}`,
    type: "delivery",
    metadata: { orderId: p.orderId },
  });
});

eventBus.on("delivery.completed", async (p) => {
  if (!p.userId) return;
  await sendNotification({
    user_id: p.userId,
    title: "Delivered! 🎉",
    body: "Your order has arrived. Enjoy!",
    type: "delivery",
    metadata: { orderId: p.orderId },
  });
});
