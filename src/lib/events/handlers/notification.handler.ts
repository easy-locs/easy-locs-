/**
 * Notification handler — listens to REAL platform events and writes to notifications_v2.
 * CANONICAL WRITE PATH — replaces legacy app_notifications writer.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { supabase } from "@/integrations/supabase/client";
import { insertNotification } from "@/lib/notifications-v2/notification-service";

// ── Message sent → notify receiver ──
platformBus.on("message.sent", (event) => {
  const msg = event.payload as any;
  const message = msg?.message;
  if (!message) return;
  console.log("[notification-v2] message.sent event captured", message.conversationId);
});

// ── Wallet transaction created → notify user ──
platformBus.on("wallet.transaction.created", (event) => {
  const { transaction } = event.payload as any;
  if (!transaction) return;
  supabase.auth.getUser().then(({ data }) => {
    const userId = data?.user?.id;
    if (!userId) return;
    void insertNotification({
      user_id: userId,
      actor: "client",
      domain: "wallet",
      type: "wallet.credit",
      title: "Transaction recorded",
      body: `${transaction.amount > 0 ? "+" : ""}${transaction.amount} ${transaction.currency ?? "AED"}`,
      data: { transactionId: transaction.id, amount: transaction.amount },
    });
  });
});

// ── Payment success → notify ──
platformBus.on("wallet.payment.success", (event) => {
  const p = event.payload as any;
  supabase.auth.getUser().then(({ data }) => {
    const userId = data?.user?.id;
    if (!userId) return;
    void insertNotification({
      user_id: userId,
      actor: "client",
      domain: "wallet",
      type: "payment.success",
      title: "Payment successful ✅",
      body: `${p.amount ?? ""} ${p.currency ?? "AED"} payment completed`,
      data: { transactionId: p.transactionId },
      related_payment_intent_id: p.paymentIntentId,
    });
  });
});

// ── Payment failed → notify ──
platformBus.on("wallet.payment.failed", (event) => {
  const p = event.payload as any;
  supabase.auth.getUser().then(({ data }) => {
    const userId = data?.user?.id;
    if (!userId) return;
    void insertNotification({
      user_id: userId,
      actor: "client",
      domain: "wallet",
      type: "payment.failed",
      title: "Payment failed ❌",
      body: p.reason || "Payment could not be processed",
      priority: "high",
      data: { transactionId: p.transactionId },
    });
  });
});

// ── Booking events ──
platformBus.on("booking.requested", (event) => {
  const { booking } = event.payload as any;
  if (!booking) return;
  supabase.auth.getUser().then(({ data }) => {
    const userId = data?.user?.id;
    if (!userId) return;
    void insertNotification({
      user_id: userId,
      actor: "client",
      domain: "system",
      type: "booking.requested",
      title: "Booking submitted",
      body: "Your booking request has been sent",
      data: { bookingId: booking.id },
    });
  });
});

platformBus.on("booking.confirmed", (event) => {
  const p = event.payload as any;
  supabase.auth.getUser().then(({ data }) => {
    const userId = data?.user?.id;
    if (!userId) return;
    void insertNotification({
      user_id: userId,
      actor: "client",
      domain: "system",
      type: "booking.confirmed",
      title: "Booking confirmed! 🎉",
      body: "Your booking has been approved",
      data: { bookingId: p.bookingId },
    });
  });
});

platformBus.on("booking.cancelled", (event) => {
  const p = event.payload as any;
  supabase.auth.getUser().then(({ data }) => {
    const userId = data?.user?.id;
    if (!userId) return;
    void insertNotification({
      user_id: userId,
      actor: "client",
      domain: "system",
      type: "booking.cancelled",
      title: "Booking cancelled",
      body: "Your booking has been cancelled",
      data: { bookingId: p.bookingId },
    });
  });
});

// ── Storefront order events ──
platformBus.on("ORDER_CREATED", (event) => {
  const p = event.payload as any;
  const userId = p.userId || p.buyerId;
  if (!userId) return;
  void insertNotification({
    user_id: userId,
    actor: "client",
    domain: "merchant",
    type: "order.confirmed",
    title: "Order confirmed",
    body: `Order #${(p.orderId as string)?.slice(0, 8) ?? ""} is confirmed`,
    data: { orderId: p.orderId, shopId: p.shopId },
    related_order_id: p.orderId,
  });
});

platformBus.on("ORDER_COMPLETED", (event) => {
  const p = event.payload as any;
  const userId = p.userId || p.buyerId;
  if (!userId) return;
  void insertNotification({
    user_id: userId,
    actor: "client",
    domain: "merchant",
    type: "order.delivered",
    title: "Order delivered! 🎉",
    body: "Your order has been delivered. Enjoy!",
    data: { orderId: p.orderId },
    related_order_id: p.orderId,
  });
});

// ── QR payment completed ──
platformBus.on("qr.payment.completed", (event) => {
  const p = event.payload as any;
  supabase.auth.getUser().then(({ data }) => {
    const userId = data?.user?.id;
    if (!userId) return;
    void insertNotification({
      user_id: userId,
      actor: "client",
      domain: "wallet",
      type: "payment.qr.success",
      title: "QR Payment successful ✅",
      body: `Payment of ${p.amount ?? ""} ${p.currency ?? "AED"} completed`,
      data: { targetId: p.targetId },
    });
  });
});

console.log("[notification-v2.handler] Registered on platformBus — writing to notifications_v2");
