/**
 * Notification Event Mapper — maps business events to notification payloads.
 * Canonical mapping from domain events to notifications_v2 inserts.
 */
import type { NotificationInsert } from "./notification-service";

type EventMapping = Omit<NotificationInsert, "user_id"> & { user_id?: string };

/** Build notification from a mobility/dispatch event */
export function mapMobilityEvent(
  eventType: string,
  targetUserId: string,
  actor: "client" | "rider" | "merchant",
  data: Record<string, any>
): NotificationInsert | null {
  const base = {
    user_id: targetUserId,
    actor,
    domain: "mobility" as const,
    data,
    related_job_id: data.job_id,
    delivery_mode: ["in_app", "realtime"] as string[],
  };

  switch (eventType) {
    case "mobility.job.searching":
      return { ...base, type: "ride.searching", title: "Looking for a driver…", body: "We're searching for a driver nearby.", priority: "normal", dedupe_key: `searching-${data.job_id}` };
    case "mobility.offer.accepted":
      return { ...base, type: "ride.assigned", title: "Driver assigned! 🚗", body: data.rider_name ? `${data.rider_name} is on the way` : "Your driver is on the way", priority: "high", delivery_mode: ["in_app", "realtime", "push"], dedupe_key: `assigned-${data.job_id}` };
    case "mobility.rider.arriving_pickup":
      return { ...base, type: "ride.arriving", title: "Driver arriving", body: "Your driver is almost at the pickup point", priority: "normal", dedupe_key: `arriving-${data.job_id}` };
    case "mobility.rider.arrived_pickup":
      return { ...base, type: "ride.arrived", title: "Driver has arrived", body: "Your driver is waiting at the pickup", priority: "high", delivery_mode: ["in_app", "realtime", "push"] };
    case "mobility.trip.started":
      return { ...base, type: "ride.started", title: "Trip started", body: "You're on your way!", priority: "normal" };
    case "mobility.trip.completed":
      return { ...base, type: "ride.completed", title: "Trip completed ✅", body: data.fare ? `Total: ${data.fare} ${data.currency ?? "AED"}` : "Thanks for riding!", priority: "normal" };
    case "mobility.no_rider_found":
      return { ...base, type: "ride.failed", title: "No driver found", body: "We couldn't find a driver. Please try again.", priority: "high" };
    case "mobility.surge.increased":
      return { ...base, type: "price.updated", title: "Price updated", body: data.new_price ? `New estimate: ${data.new_price} ${data.currency ?? "AED"}` : "Fare updated due to demand", priority: "normal" };
    // Rider-facing
    case "mobility.offer.created":
      return { ...base, type: "rider.new_offer", title: "New ride request 🔔", body: data.distance ? `${data.distance} km away` : "New job available", priority: "high", delivery_mode: ["in_app", "realtime", "push"] };
    case "mobility.offer.expiring":
      return { ...base, type: "rider.offer_expiring", title: "Offer expiring soon", body: "Accept now or it will expire", priority: "high" };
    default:
      return null;
  }
}

/** Build notification from a wallet/payment event */
export function mapWalletEvent(
  eventType: string,
  targetUserId: string,
  actor: "client" | "rider" | "merchant",
  data: Record<string, any>
): NotificationInsert | null {
  const base = {
    user_id: targetUserId,
    actor,
    domain: "wallet" as const,
    data,
    related_payment_intent_id: data.payment_intent_id,
    delivery_mode: ["in_app", "realtime"] as string[],
  };

  switch (eventType) {
    case "payment.capture.succeeded":
      return { ...base, type: "payment.success", title: "Payment successful ✅", body: `${data.amount ?? ""} ${data.currency ?? "AED"} charged`, priority: "normal" };
    case "payment.capture.failed":
      return { ...base, type: "payment.failed", title: "Payment failed ❌", body: data.reason || "Payment could not be processed", priority: "high" };
    case "payment.refunded":
      return { ...base, type: "payment.refund", title: "Refund processed", body: `${data.amount ?? ""} ${data.currency ?? "AED"} refunded`, priority: "normal" };
    case "wallet.credited":
      return { ...base, type: "wallet.credit", title: "Wallet credited 💰", body: `+${data.amount ?? ""} ${data.currency ?? "AED"}`, priority: "normal" };
    case "settlement.completed":
      return { ...base, type: "settlement.done", title: "Settlement completed", body: `${data.amount ?? ""} ${data.currency ?? "AED"} settled`, priority: "normal" };
    default:
      return null;
  }
}

/** Build notification from a merchant/restaurant event */
export function mapMerchantEvent(
  eventType: string,
  targetUserId: string,
  actor: "merchant" | "client",
  data: Record<string, any>
): NotificationInsert | null {
  const base = {
    user_id: targetUserId,
    actor,
    domain: "food_delivery" as const,
    data,
    related_order_id: data.order_id,
    related_job_id: data.job_id,
    delivery_mode: ["in_app", "realtime"] as string[],
  };

  switch (eventType) {
    case "merchant.order.received":
      return { ...base, type: "order.received", title: "New order received 📦", body: data.items_summary || "New order to prepare", priority: "high", delivery_mode: ["in_app", "realtime", "push"] };
    case "merchant.order.preparing":
      return { ...base, type: "order.preparing", title: "Order being prepared", body: "The restaurant is preparing your order", priority: "normal", dedupe_key: `preparing-${data.order_id}` };
    case "merchant.order.ready":
      return { ...base, type: "order.ready", title: "Order ready for pickup", body: "Your order is ready!", priority: "high" };
    case "merchant.rider.assigned":
      return { ...base, type: "rider.assigned", title: "Rider assigned", body: data.rider_name || "A rider has been assigned for pickup", priority: "normal" };
    case "merchant.rider.arrived":
      return { ...base, type: "rider.arrived_merchant", title: "Rider has arrived", body: "Rider is at the restaurant", priority: "high" };
    default:
      return null;
  }
}

/** Build notification from Orbit events */
export function mapOrbitEvent(
  eventType: string,
  targetUserId: string,
  actor: "client" | "rider" | "merchant",
  data: Record<string, any>
): NotificationInsert | null {
  const base = {
    user_id: targetUserId,
    actor,
    domain: "orbit" as const,
    data,
    related_conversation_id: data.conversation_id,
    delivery_mode: ["in_app", "realtime"] as string[],
  };

  switch (eventType) {
    case "orbit.message.received":
      return { ...base, type: "orbit.message", title: data.sender_name || "New message", body: data.preview || "You have a new message", priority: "normal", dedupe_key: `msg-${data.conversation_id}-${Math.floor(Date.now() / 30000)}` };
    case "orbit.call.missed":
      return { ...base, type: "orbit.missed_call", title: "Missed call", body: data.caller_name || "You missed a call", priority: "high", delivery_mode: ["in_app", "realtime", "push"] };
    case "orbit.call.incoming":
      return { ...base, type: "orbit.incoming_call", title: "Incoming call 📞", body: data.caller_name || "Someone is calling you", priority: "critical", delivery_mode: ["in_app", "realtime", "push"] };
    default:
      return null;
  }
}

/** Build admin/system notification */
export function mapAdminEvent(
  eventType: string,
  targetUserId: string,
  data: Record<string, any>
): NotificationInsert | null {
  const base = {
    user_id: targetUserId,
    actor: "admin" as const,
    domain: "admin" as const,
    data,
    delivery_mode: ["in_app", "realtime"] as string[],
  };

  switch (eventType) {
    case "dispatch.failure":
      return { ...base, type: "admin.dispatch_failure", title: "Dispatch failure", body: `Job ${data.job_id?.slice(0, 8)} failed to find a rider`, priority: "high" };
    case "payment_exception":
      return { ...base, type: "admin.payment_exception", title: "Payment exception", body: data.reason || "A payment error occurred", priority: "critical" };
    case "self_acceptance_blocked":
      return { ...base, type: "admin.security", title: "Self-acceptance blocked", body: `User ${data.user_id?.slice(0, 8)} tried to accept own ride`, priority: "high" };
    default:
      return null;
  }
}
