import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";
import { reportHealth } from "@/lib/runtime/health-aggregator";
import { DEEP_LINK_MAP, resolveDeepLink } from "@/lib/notifications/deepLinks";

let notificationCallback: ((n: { title: string; body: string; scope: string; severity: string; deepLink?: string }) => void) | null = null;

export function registerNotificationHandler(fn: typeof notificationCallback) {
  notificationCallback = fn;
}

export function getDeepLinkCoverage(): number {
  return Object.keys(DEEP_LINK_MAP).length;
}

function notify(title: string, body: string, scope: string, severity = "info", notificationType?: string) {
  const deepLink = notificationType ? resolveDeepLink(notificationType) : undefined;
  notificationCallback?.({ title, body, scope, severity, deepLink });
}

export function installNotificationEventBridge(): () => void {
  const unsubs = [
    platformBus.on(APP_EVENTS.WALLET_PAYMENT_SUCCESS, (e) => {
      const p = e.payload as Record<string, unknown>;
      notify("Payment successful", `${p?.amount ?? ""} ${p?.currency ?? ""}`.trim(), "wallet", "success", "payment_received");
      reportHealth("notifications", "ok");
    }),
    platformBus.on(APP_EVENTS.WALLET_PAYMENT_FAILED, (e) => {
      const p = e.payload as Record<string, unknown>;
      notify("Payment failed", (p?.error as string) ?? "Transaction failed", "wallet", "error", "payment_failed");
    }),
    platformBus.on(APP_EVENTS.ORBIT_MESSAGE_RECEIVED, () => {
      reportHealth("notifications", "ok");
    }),
    platformBus.on("delivery:completed", () => {
      notify("Delivery completed", "Order delivered successfully", "delivery", "success", "delivery_update");
    }),
    platformBus.on("storefront:order_placed", () => {
      notify("New order", "You have a new order", "orders", "info", "new_order");
    }),
    platformBus.on("marketplace:booking_created", (e) => {
      const p = e.payload as Record<string, unknown>;
      notify("Booking created", (p?.reference as string) ?? "New booking request", "booking", "info", "booking_confirmed");
    }),
    platformBus.on("marketplace:booking_confirmed", (e) => {
      const p = e.payload as Record<string, unknown>;
      notify("Booking confirmed", (p?.reference as string) ?? "Your booking is confirmed", "booking", "success");
    }),
    platformBus.on("marketplace:booking_cancelled", () => {
      notify("Booking cancelled", "A booking has been cancelled", "booking", "warning");
    }),
    platformBus.on("marketplace:listing_published", (e) => {
      const p = e.payload as Record<string, unknown>;
      notify("Listing published", (p?.title as string) ?? "Your listing is live", "marketplace", "success");
    }),
    platformBus.on("marketplace:listing_paused", () => {
      notify("Listing paused", "Your listing has been paused", "marketplace", "info");
    }),
    platformBus.on("marketplace:vente_completed", (e) => {
      const p = e.payload as Record<string, unknown>;
      notify("Sale completed", `${p?.amount ?? ""} ${p?.currency ?? ""}`.trim() || "Transaction finalized", "marketplace", "success");
    }),
    platformBus.on("marketplace:contact_opened", () => {
      notify("New contact", "Someone reached out via your listing", "marketplace", "info");
    }),
    platformBus.on("marketplace:review_submitted", (e) => {
      const p = e.payload as Record<string, unknown>;
      notify("New review", `Rating: ${p?.rating ?? ""}★`, "marketplace", "info");
    }),
    platformBus.on("wallet:receipt_generated", () => {
      notify("Receipt ready", "Your payment receipt is available", "wallet", "info");
    }),
    platformBus.on("wallet:commission_split", (e) => {
      const p = e.payload as Record<string, unknown>;
      notify("Commission processed", `${p?.commission ?? ""} ${p?.currency ?? ""}`.trim(), "wallet", "info");
    }),
    platformBus.on("wallet:top_up", (e) => {
      const p = e.payload as Record<string, unknown>;
      notify("Top-up successful", `${p?.amount ?? ""} ${p?.currency ?? ""}`.trim(), "wallet", "success");
    }),
    platformBus.on("orbit:call_started", () => {
      notify("Incoming call", "You have an incoming call", "communication", "info", "incoming_call");
    }),
    platformBus.on("orbit:media_attached", () => {
      reportHealth("notifications", "ok");
    }),
    platformBus.on("pm:lease_created", () => {
      notify("Lease created", "A new lease has been set up", "property", "info");
    }),
    platformBus.on("pm:payment_received", (e) => {
      const p = e.payload as Record<string, unknown>;
      notify("Rent payment received", `${p?.amount ?? ""} ${p?.currency ?? ""}`.trim(), "property", "success");
    }),
    platformBus.on("pm:intervention_created", () => {
      notify("Maintenance request", "A new maintenance request was filed", "property", "warning");
    }),
    platformBus.on("property:published_to_marketplace", (e) => {
      const p = e.payload as Record<string, unknown>;
      notify("Property listed", (p?.title as string) ?? "Your property is now on the marketplace", "property", "success");
    }),
    platformBus.on("onboarding:completed", (e) => {
      const p = e.payload as Record<string, unknown>;
      notify("Onboarding complete", `Your ${(p?.target_type as string) ?? "account"} is set up`, "onboarding", "success");
    }),
    platformBus.on("publish:gate_blocked", (e) => {
      const p = e.payload as Record<string, unknown>;
      notify("Publication blocked", (p?.reason as string) ?? "Quality gate did not pass", "onboarding", "error");
    }),
    platformBus.on("marketplace:stock_updated", (e) => {
      const p = e.payload as Record<string, unknown>;
      if ((p?.quantity as number) <= 3) {
        notify("Low stock", `${(p?.title as string) ?? "Item"}: ${p?.quantity} remaining`, "marketplace", "warning");
      }
    }),

    platformBus.on("hotel:booking_created", (e) => {
      const p = e.payload as Record<string, unknown>;
      notify("New hotel booking", `${(p?.guestName as string) ?? "Guest"} — ${p?.checkIn} → ${p?.checkOut}`, "hotel", "info", "hotel.booking_created");
    }),
    platformBus.on("hotel:booking_confirmed", (e) => {
      const p = e.payload as Record<string, unknown>;
      notify("Booking confirmed", `Ref: ${(p?.bookingReference as string) ?? ""} confirmed`, "hotel", "success", "hotel.booking_confirmed");
    }),
    platformBus.on("hotel:booking_rejected", (e) => {
      const p = e.payload as Record<string, unknown>;
      notify("Booking declined", (p?.reason as string) ?? "Your booking could not be confirmed", "hotel", "error", "hotel.booking_rejected");
    }),
    platformBus.on("hotel:booking_cancelled", (e) => {
      const p = e.payload as Record<string, unknown>;
      notify("Booking cancelled", (p?.cancelledBy as string) === "guest" ? "Guest cancelled" : "Hotel cancelled", "hotel", "warning", "hotel.booking_cancelled");
    }),
    platformBus.on("hotel:guest_checked_in", (e) => {
      const p = e.payload as Record<string, unknown>;
      notify("Guest checked in", `Ref: ${(p?.bookingReference as string) ?? ""}`, "hotel", "success", "hotel.checked_in");
    }),
    platformBus.on("hotel:guest_checked_out", (e) => {
      const p = e.payload as Record<string, unknown>;
      notify("Guest checked out", `Ref: ${(p?.bookingReference as string) ?? ""}`, "hotel", "info", "hotel.checked_out");
    }),
  ];
  return () => unsubs.forEach(u => u());
}
