/**
 * Notification handler — listens to REAL platform events and writes notifications.
 * Uses platformBus (the actual event bus used by stores), not the orphaned eventBus.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { supabase } from "@/integrations/supabase/client";

async function sendNotification(input: {
  user_id: string;
  title: string;
  body: string;
  type: string;
  metadata?: Record<string, any>;
}) {
  try {
    const { error } = await (supabase as any).from("app_notifications").insert({
      id: crypto.randomUUID(),
      user_id: input.user_id,
      orbitId: input.user_id,
      title: input.title,
      body: input.body,
      type: input.type,
      metadata: input.metadata ?? null,
      read: false,
    });
    if (error) {
      console.warn("[notification] insert error", error.message);
    } else {
      console.log("[notification] sent", input.type, input.user_id);
    }
  } catch (e) {
    console.error("[notification] send error", e);
  }
}

// ── Message sent → notify receiver ──
platformBus.on("message.sent", (event) => {
  const msg = event.payload as any;
  // msg.message contains the saved ChatMessageRecord
  const message = msg?.message;
  if (!message) return;
  
  // We need the receiver — get conversation participants to find the other user
  // For now, log that the event fired (receiver resolution requires conversation lookup)
  console.log("[notification] message.sent event captured", message.conversationId);
});

// ── Wallet transaction created → notify user ──
platformBus.on("wallet.transaction.created", (event) => {
  const { transaction } = event.payload as any;
  if (!transaction) return;
  
  // Get current user from auth
  supabase.auth.getUser().then(({ data }) => {
    const userId = data?.user?.id;
    if (!userId) return;
    
    void sendNotification({
      user_id: userId,
      title: "Transaction recorded",
      body: `${transaction.amount > 0 ? "+" : ""}${transaction.amount} ${transaction.currency ?? "AED"}`,
      type: "wallet",
      metadata: { transactionId: transaction.id, amount: transaction.amount },
    });
  });
});

// ── Payment success → notify ──
platformBus.on("wallet.payment.success", (event) => {
  const p = event.payload as any;
  supabase.auth.getUser().then(({ data }) => {
    const userId = data?.user?.id;
    if (!userId) return;
    void sendNotification({
      user_id: userId,
      title: "Payment successful ✅",
      body: `${p.amount ?? ""} ${p.currency ?? "AED"} payment completed`,
      type: "wallet",
      metadata: { transactionId: p.transactionId },
    });
  });
});

// ── Payment failed → notify ──
platformBus.on("wallet.payment.failed", (event) => {
  const p = event.payload as any;
  supabase.auth.getUser().then(({ data }) => {
    const userId = data?.user?.id;
    if (!userId) return;
    void sendNotification({
      user_id: userId,
      title: "Payment failed ❌",
      body: p.reason || "Payment could not be processed",
      type: "wallet",
      metadata: { transactionId: p.transactionId },
    });
  });
});

// ── Booking requested → notify ──
platformBus.on("booking.requested", (event) => {
  const { booking } = event.payload as any;
  if (!booking) return;
  supabase.auth.getUser().then(({ data }) => {
    const userId = data?.user?.id;
    if (!userId) return;
    void sendNotification({
      user_id: userId,
      title: "Booking submitted",
      body: `Your booking request has been sent`,
      type: "booking",
      metadata: { bookingId: booking.id },
    });
  });
});

// ── Booking confirmed → notify ──
platformBus.on("booking.confirmed", (event) => {
  const p = event.payload as any;
  supabase.auth.getUser().then(({ data }) => {
    const userId = data?.user?.id;
    if (!userId) return;
    void sendNotification({
      user_id: userId,
      title: "Booking confirmed! 🎉",
      body: "Your booking has been approved",
      type: "booking",
      metadata: { bookingId: p.bookingId },
    });
  });
});

// ── Booking cancelled → notify ──
platformBus.on("booking.cancelled", (event) => {
  const p = event.payload as any;
  supabase.auth.getUser().then(({ data }) => {
    const userId = data?.user?.id;
    if (!userId) return;
    void sendNotification({
      user_id: userId,
      title: "Booking cancelled",
      body: "Your booking has been cancelled",
      type: "booking",
      metadata: { bookingId: p.bookingId },
    });
  });
});

// ── Storefront order events ──
platformBus.on("ORDER_CREATED", (event) => {
  const p = event.payload as any;
  const userId = p.userId || p.buyerId;
  if (!userId) return;
  void sendNotification({
    user_id: userId,
    title: "Order confirmed",
    body: `Order #${(p.orderId as string)?.slice(0, 8) ?? ""} is confirmed`,
    type: "order",
    metadata: { orderId: p.orderId, shopId: p.shopId },
  });
});

platformBus.on("ORDER_COMPLETED", (event) => {
  const p = event.payload as any;
  const userId = p.userId || p.buyerId;
  if (!userId) return;
  void sendNotification({
    user_id: userId,
    title: "Order delivered! 🎉",
    body: "Your order has been delivered. Enjoy!",
    type: "order",
    metadata: { orderId: p.orderId },
  });
});

// ── Support ticket created → log (handled by support engine) ──
platformBus.on("ISSUE_CREATED", (event) => {
  console.log("[notification] support issue created", event.payload);
});

// ── QR payment completed → notify ──
platformBus.on("qr.payment.completed", (event) => {
  const p = event.payload as any;
  supabase.auth.getUser().then(({ data }) => {
    const userId = data?.user?.id;
    if (!userId) return;
    void sendNotification({
      user_id: userId,
      title: "QR Payment successful ✅",
      body: `Payment of ${p.amount ?? ""} ${p.currency ?? "AED"} completed`,
      type: "wallet",
      metadata: { targetId: p.targetId },
    });
  });
});

console.log("[notification.handler] Registered on platformBus");