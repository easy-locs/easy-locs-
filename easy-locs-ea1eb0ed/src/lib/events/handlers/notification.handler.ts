/**
 * Notification handler — listens to canonical platform events (colon notation)
 * and writes to app_notifications via insertNotification.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { db } from "@/services/db";
import { insertNotification } from "@/lib/notification-service/notification-service";
import { mapFoodOrderEvent } from "@/lib/notification-service/notification-event-mapper";

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

// ── C2C: new message on listing ──
platformBus.on("c2c:new_message", (event) => {
  const p = event.payload as { sellerId?: string; listingTitle?: string; buyerName?: string; listingId?: string; conversationId?: string };
  if (!p.sellerId) return;
  void insertNotification({
    user_id: p.sellerId,
    actor: "client",
    domain: "system",
    type: "c2c.new_message",
    title: "Nouveau message pour votre annonce",
    body: `${p.buyerName ?? "Un acheteur"} vous a contacté pour "${p.listingTitle ?? "votre annonce"}"`,
    priority: "normal",
    data: { listingId: p.listingId, conversationId: p.conversationId },
    action_url: p.conversationId ? `/orbit/chat/${p.conversationId}` : undefined,
    dedupe_key: p.listingId && p.conversationId ? `c2c_msg_${p.listingId}_${p.conversationId}` : undefined,
  });
});

// ── C2C: listing expiry soon ──
platformBus.on("c2c:listing_expiry", (event) => {
  const p = event.payload as { sellerId?: string; listingTitle?: string; listingId?: string; daysLeft?: number };
  if (!p.sellerId) return;
  void insertNotification({
    user_id: p.sellerId,
    actor: "client",
    domain: "system",
    type: "c2c.listing_expiry",
    title: "Annonce bientôt expirée ⏰",
    body: `"${p.listingTitle ?? "Votre annonce"}" expire dans ${p.daysLeft ?? 3} jour${(p.daysLeft ?? 3) > 1 ? "s" : ""}. Renouvelez-la pour continuer à la diffuser.`,
    priority: "normal",
    data: { listingId: p.listingId, daysLeft: p.daysLeft },
    action_url: p.listingId ? `/dashboard/my-shop` : undefined,
    dedupe_key: p.listingId ? `c2c_expiry_${p.listingId}` : undefined,
  });
});

// ── C2C: price drop on followed listing ──
platformBus.on("c2c:price_drop", (event) => {
  const p = event.payload as { followerId?: string; listingTitle?: string; listingId?: string; oldPrice?: number; newPrice?: number; currency?: string };
  if (!p.followerId) return;
  const currency = p.currency ?? "EUR";
  void insertNotification({
    user_id: p.followerId,
    actor: "client",
    domain: "system",
    type: "c2c.price_drop",
    title: "Baisse de prix 🏷️",
    body: `"${p.listingTitle ?? "Un article que vous suivez"}" a baissé de ${p.oldPrice ?? ""} à ${p.newPrice ?? ""} ${currency}`,
    priority: "normal",
    data: { listingId: p.listingId, oldPrice: p.oldPrice, newPrice: p.newPrice, currency },
    action_url: p.listingId ? `/marketplace/c2c/${p.listingId}` : undefined,
    dedupe_key: p.listingId ? `c2c_price_${p.listingId}_${p.newPrice}` : undefined,
  });
});

// ── C2C: similar listing posted at lower price (seller alert) ──
platformBus.on("c2c:similar_lower_price", (event) => {
  const p = event.payload as {
    sellerId?: string;
    sellerListingTitle?: string;
    sellerListingId?: string;
    sellerPrice?: number;
    competitorTitle?: string;
    competitorListingId?: string;
    competitorPrice?: number;
    currency?: string;
  };
  if (!p.sellerId) return;
  const currency = p.currency ?? "EUR";
  void insertNotification({
    user_id: p.sellerId,
    actor: "client",
    domain: "system",
    type: "c2c.similar_lower_price",
    title: "Annonce concurrente moins chère 📉",
    body: `"${p.competitorTitle ?? "Un article similaire"}" a été publié à ${p.competitorPrice ?? "?"} ${currency} (votre prix : ${p.sellerPrice ?? "?"} ${currency})`,
    priority: "normal",
    data: { sellerListingId: p.sellerListingId, competitorListingId: p.competitorListingId, competitorPrice: p.competitorPrice, sellerPrice: p.sellerPrice },
    action_url: p.sellerListingId ? `/dashboard/my-shop` : undefined,
    dedupe_key: p.sellerListingId && p.competitorListingId ? `c2c_similar_${p.sellerListingId}_${p.competitorListingId}` : undefined,
  });
});

// ── Food order lifecycle notifications ──
interface FoodEventPayload {
  buyerId?: string;
  sellerId?: string;
  shopId?: string;
  orderId?: string;
  [key: string]: unknown;
}

const FOOD_BUYER_EVENTS = [
  "food:order_accepted",
  "food:order_preparing",
  "food:order_ready",
  "food:order_dispatched",
  "food:order_delivered",
  "food:order_cancelled",
] as const;

for (const eventType of FOOD_BUYER_EVENTS) {
  platformBus.on(eventType, (event) => {
    const data = event.payload as FoodEventPayload;
    const buyerId = data?.buyerId;
    if (!buyerId) return;
    const notification = mapFoodOrderEvent(eventType, buyerId, "merchant", data as Record<string, string>);
    if (notification) void insertNotification(notification);
  });
}

platformBus.on("food:order_placed", (event) => {
  const data = event.payload as FoodEventPayload;
  if (data?.sellerId) {
    const notification = mapFoodOrderEvent("food:order_placed", data.sellerId, "client", data as Record<string, string>);
    if (notification) void insertNotification(notification);
  }
});

platformBus.on("food:order_delivered", (event) => {
  const data = event.payload as FoodEventPayload;
  if (data?.sellerId) {
    const notification = mapFoodOrderEvent("food:order_delivered", data.sellerId, "client", data as Record<string, string>);
    if (notification) void insertNotification(notification);
  }
});

// ── C2C: new listing matching saved search ──
platformBus.on("c2c:saved_search_match", (event) => {
  const p = event.payload as { userId?: string; searchName?: string; listingTitle?: string; listingId?: string };
  if (!p.userId) return;
  void insertNotification({
    user_id: p.userId,
    actor: "client",
    domain: "system",
    type: "c2c.saved_search_match",
    title: `Nouvelle annonce pour "${p.searchName ?? "votre alerte"}" 🔔`,
    body: `"${p.listingTitle ?? "Une annonce"}" correspond à votre recherche sauvegardée`,
    priority: "normal",
    data: { listingId: p.listingId, searchName: p.searchName },
    action_url: p.listingId ? `/marketplace/c2c/${p.listingId}` : `/marketplace/c2c`,
    dedupe_key: p.listingId && p.userId ? `c2c_search_${p.userId}_${p.listingId}` : undefined,
  });
});

