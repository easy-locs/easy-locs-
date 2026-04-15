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

// ── Taxi & Ride events ──
export function mapRideEvent(
  eventType: string,
  targetUserId: string,
  actor: "client" | "rider",
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
    case "ride:offer_sent":
    case "ride:offer_received":
      return { ...base, type: "ride.offer_received", title: "New ride request 🔔", body: data.distance ? `Pickup ${data.distance} km away · ${data.estimated_price ?? ""} ${data.currency ?? "AED"}` : "New ride available", priority: "critical", delivery_mode: ["in_app", "realtime", "push"], dedupe_key: `offer-${data.offer_id ?? data.job_id}` };
    case "ride:accepted":
      return { ...base, type: "ride.accepted", title: "Driver found! 🚗", body: data.driver_name ? `${data.driver_name} is on the way · ${data.vehicle_plate ?? ""}` : "Your driver is on the way", priority: "high", delivery_mode: ["in_app", "realtime", "push"], dedupe_key: `accepted-${data.job_id}` };
    case "ride:driver_arriving":
      return { ...base, type: "ride.driver_arriving", title: "Driver approaching", body: data.eta_minutes ? `Arriving in ~${data.eta_minutes} min` : "Your driver is almost there", priority: "normal", dedupe_key: `arriving-${data.job_id}` };
    case "ride:driver_arrived":
      return { ...base, type: "ride.driver_arrived", title: "Driver has arrived! 📍", body: "Your driver is waiting at the pickup point", priority: "high", delivery_mode: ["in_app", "realtime", "push"], dedupe_key: `arrived-${data.job_id}` };
    case "ride:trip_started":
      return { ...base, type: "ride.trip_started", title: "Trip started 🛣️", body: "You're on your way to the destination", priority: "normal", dedupe_key: `started-${data.job_id}` };
    case "ride:trip_completed":
      return { ...base, type: "ride.trip_completed", title: "Trip completed ✅", body: data.fare ? `Total: ${data.fare} ${data.currency ?? "AED"}` : "Thanks for riding!", priority: "normal", delivery_mode: ["in_app", "realtime", "push"], dedupe_key: `completed-${data.job_id}` };
    case "ride:cancelled":
      return { ...base, type: "ride.cancelled", title: "Ride cancelled", body: data.reason || "The ride has been cancelled", priority: "high", delivery_mode: ["in_app", "realtime", "push"], dedupe_key: `cancelled-${data.job_id}` };
    default:
      return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  FOOD ORDER EVENTS
// ═══════════════════════════════════════════════════════════════════
export function mapFoodOrderEvent(
  eventType: string,
  targetUserId: string,
  actor: "client" | "merchant" | "rider",
  data: Record<string, any>
): NotificationInsert | null {
  const base = {
    user_id: targetUserId,
    actor,
    domain: "food_delivery" as const,
    data,
    related_order_id: data.order_id ?? data.orderId,
    delivery_mode: ["in_app", "realtime"] as string[],
  };

  switch (eventType) {
    case "food:order_placed":
      return {
        ...base,
        type: "food.order_placed",
        title: "New order received! \uD83D\uDD14",
        body: data.items_summary
          ? `${data.items_summary} — ${data.total ?? ""} ${data.currency ?? "AED"}`
          : `New order — ${data.total ?? ""} ${data.currency ?? "AED"}`,
        priority: "critical",
        delivery_mode: ["push", "in_app", "realtime"],
        dedupe_key: `food-placed-${data.orderId}`,
      };
    case "food:order_accepted":
      return {
        ...base,
        type: "food.order_accepted",
        title: "Order accepted \u2705",
        body: data.estimatedPrepMinutes
          ? `Your order is confirmed! Estimated ~${data.estimatedPrepMinutes} min`
          : "Your order has been accepted by the restaurant",
        priority: "high",
        delivery_mode: ["push", "in_app"],
        dedupe_key: `food-accepted-${data.orderId}`,
      };
    case "food:order_preparing":
      return {
        ...base,
        type: "food.order_preparing",
        title: "Being prepared \uD83D\uDC68\u200D\uD83C\uDF73",
        body: "The restaurant is preparing your order",
        priority: "normal",
        delivery_mode: ["push"],
        dedupe_key: `food-preparing-${data.orderId}`,
      };
    case "food:order_ready":
      return {
        ...base,
        type: "food.order_ready",
        title: "Order ready! \uD83C\uDF7D\uFE0F",
        body: "Your order is ready, a rider is on the way",
        priority: "high",
        delivery_mode: ["push", "in_app"],
        dedupe_key: `food-ready-${data.orderId}`,
      };
    case "food:order_dispatched":
      return {
        ...base,
        type: "food.order_dispatched",
        title: "Rider on the way \uD83D\uDEF5",
        body: data.rider_name
          ? `${data.rider_name} is picking up your order`
          : "A rider is picking up your order",
        priority: "high",
        delivery_mode: ["push", "in_app"],
        dedupe_key: `food-dispatched-${data.orderId}`,
      };
    case "food:order_delivered":
      return {
        ...base,
        type: "food.order_delivered",
        title: "Delivered! \uD83C\uDF89",
        body: "Your order has been delivered. Enjoy your meal!",
        priority: "normal",
        delivery_mode: ["push", "in_app"],
        dedupe_key: `food-delivered-${data.orderId}`,
      };
    case "food:order_cancelled":
      return {
        ...base,
        type: "food.order_cancelled",
        title: "Order cancelled",
        body: data.reason || "Your order has been cancelled",
        priority: "high",
        delivery_mode: ["push", "in_app"],
        dedupe_key: `food-cancelled-${data.orderId}`,
      };
    default:
      return null;
  }
}

// ── Commerce events ──
export function mapCommerceEvent(
  eventType: string,
  targetUserId: string,
  actor: "client" | "merchant",
  data: Record<string, any>
): NotificationInsert | null {
  const base = {
    user_id: targetUserId,
    actor,
    domain: "commerce" as const,
    data,
    related_order_id: data.order_id,
    delivery_mode: ["in_app", "realtime"] as string[],
  };

  switch (eventType) {
    case "commerce.order.confirmed":
      return { ...base, type: "commerce.order_confirmed", title: "Order confirmed", body: `Order #${(data.order_id || "").slice(0, 8)} is confirmed`, priority: "normal", delivery_mode: ["in_app", "realtime", "push"] };
    case "commerce.order.shipped":
      return { ...base, type: "commerce.order_shipped", title: "Order shipped 📦", body: "Your order is on its way!", priority: "normal" };
    case "commerce.return.requested":
      return { ...base, type: "commerce.return_requested", title: "Return request received", body: `Return requested for order #${(data.order_id || "").slice(0, 8)}`, priority: "high", delivery_mode: ["in_app", "realtime", "push"] };
    case "commerce.return.approved":
      return { ...base, type: "commerce.return_approved", title: "Return approved", body: "Your return has been approved. Refund is being processed.", priority: "normal" };
    case "commerce.return.rejected":
      return { ...base, type: "commerce.return_rejected", title: "Return rejected", body: data.reason || "Your return request was rejected", priority: "normal" };
    case "commerce.stock.low":
      return { ...base, type: "commerce.low_stock", title: "Low stock alert ⚠️", body: `${data.item_name || "An item"} is running low (${data.current_stock} left)`, priority: "high" };
    case "commerce.stock.out":
      return { ...base, type: "commerce.out_of_stock", title: "Out of stock 🚨", body: `${data.item_name || "An item"} is out of stock`, priority: "critical" };
    case "commerce.wishlist.price_drop":
      return { ...base, type: "commerce.price_drop", title: "Price drop! 💰", body: `${data.item_name || "A wishlisted item"} is now ${data.new_price || "cheaper"}`, priority: "normal" };
    default:
      return null;
  }
}

// ── Service booking events ──
export function mapServiceEvent(
  eventType: string,
  targetUserId: string,
  actor: "client" | "provider",
  data: Record<string, any>
): NotificationInsert | null {
  const base = {
    user_id: targetUserId,
    actor,
    domain: "services" as const,
    data,
    delivery_mode: ["in_app", "realtime"] as string[],
  };

  switch (eventType) {
    case "service.booking.requested":
      return { ...base, type: "service.booking_requested", title: "New booking request 📅", body: `${data.service_title || "Service"} on ${data.date || ""}`, priority: "high", delivery_mode: ["in_app", "realtime", "push"] };
    case "service.booking.confirmed":
      return { ...base, type: "service.booking_confirmed", title: "Booking confirmed ✅", body: `Your booking for ${data.service_title || "a service"} is confirmed`, priority: "normal", delivery_mode: ["in_app", "realtime", "push"] };
    case "service.booking.rejected":
      return { ...base, type: "service.booking_rejected", title: "Booking declined", body: data.reason || "The provider could not accept your booking", priority: "normal" };
    case "service.booking.cancelled":
      return { ...base, type: "service.booking_cancelled", title: "Booking cancelled", body: data.reason || "A booking has been cancelled", priority: "high" };
    case "service.booking.reminder":
      return { ...base, type: "service.booking_reminder", title: "Upcoming appointment 🔔", body: `${data.service_title || "Service"} at ${data.time || ""} today`, priority: "high", delivery_mode: ["in_app", "realtime", "push"] };
    case "service.booking.completed":
      return { ...base, type: "service.booking_completed", title: "Service completed", body: `Your ${data.service_title || "service"} session is complete. Leave a review!`, priority: "normal" };
    case "service.booking.started":
      return { ...base, type: "service.booking_started", title: "Service in progress", body: `${data.service_title || "Service"} has started`, priority: "normal" };
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
