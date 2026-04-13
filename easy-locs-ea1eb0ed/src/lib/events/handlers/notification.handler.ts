/**
 * Notification handler — listens to canonical platform events (colon notation)
 * and writes to app_notifications via insertNotification.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { db } from "@/services/db";
import { insertNotification } from "@/lib/notification-service/notification-service";

interface WalletTransactionPayload {
  transaction: {
    id: string;
    amount: number;
    currency?: string;
  };
  walletBalance?: number;
}

interface PaymentPayload {
  amount?: number;
  currency?: string;
  walletBalance?: number;
  transactionId?: string;
  paymentIntentId?: string;
  reason?: string;
}

interface BookingPayload {
  booking?: { id: string };
  bookingId?: string;
}

interface OrderPayload {
  userId?: string;
  buyerId?: string;
  orderId?: string;
  shopId?: string;
}

interface QrPaymentPayload {
  amount?: number;
  currency?: string;
  targetId?: string;
}

platformBus.on("orbit:message_sent", (event) => {
  const msg = event.payload as Record<string, unknown>;
  const message = msg?.message as Record<string, unknown> | undefined;
  if (!message) return;
});

platformBus.on("wallet:transaction_created", (event) => {
  const { transaction, walletBalance } = event.payload as WalletTransactionPayload;
  if (!transaction) return;
  db.auth.getUser().then(({ data }) => {
    const userId = data?.user?.id;
    if (!userId) return;
    const currency = transaction.currency ?? "AED";
    const sign = transaction.amount > 0 ? "+" : "";
    const amountStr = `${sign}${transaction.amount} ${currency}`;
    const balanceStr = walletBalance != null ? ` · Balance: ${walletBalance} ${currency}` : "";
    void insertNotification({
      user_id: userId,
      actor: "client",
      domain: "wallet",
      type: "wallet.credit",
      title: "Transaction recorded",
      body: `${amountStr}${balanceStr}`,
      data: { transactionId: transaction.id, amount: transaction.amount, balance: walletBalance, currency },
    });
  });
});

// ── Payment success → notify ──
platformBus.on("wallet:payment_success", (event) => {
  const p = event.payload as PaymentPayload;
  db.auth.getUser().then(({ data }) => {
    const userId = data?.user?.id;
    if (!userId) return;
    const currency = p.currency ?? "AED";
    const balanceStr = p.walletBalance != null ? ` · Balance: ${p.walletBalance} ${currency}` : "";
    void insertNotification({
      user_id: userId,
      actor: "client",
      domain: "wallet",
      type: "payment.success",
      title: "Payment successful ✅",
      body: `${p.amount ?? ""} ${currency} payment completed${balanceStr}`,
      data: { transactionId: p.transactionId, balance: p.walletBalance, currency },
      related_payment_intent_id: p.paymentIntentId,
    });
  });
});

// ── Payment failed → notify ──
platformBus.on("wallet:payment_failed", (event) => {
  const p = event.payload as PaymentPayload;
  db.auth.getUser().then(({ data }) => {
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
platformBus.on("booking:requested", (event) => {
  const { booking } = event.payload as BookingPayload;
  if (!booking) return;
  db.auth.getUser().then(({ data }) => {
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

platformBus.on("booking:confirmed", (event) => {
  const p = event.payload as BookingPayload;
  db.auth.getUser().then(({ data }) => {
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

platformBus.on("booking:cancelled", (event) => {
  const p = event.payload as BookingPayload;
  db.auth.getUser().then(({ data }) => {
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
  const p = event.payload as OrderPayload;
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
  const p = event.payload as OrderPayload;
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
platformBus.on("qr:payment_completed", (event) => {
  const p = event.payload as QrPaymentPayload;
  db.auth.getUser().then(({ data }) => {
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

