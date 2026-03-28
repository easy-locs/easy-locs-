/**
 * useBookingLifecycle — centralized hook for marketplace booking operations.
 */
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { syncPaymentRequest } from "@/lib/shared/sync-engine";
import { platformBus } from "@/lib/shared/platform-bus";
import * as dealRepo from "@/repositories/deal.repository";

export type BookingStatus =
  | "pending" | "new" | "awaiting_payment"
  | "confirmed" | "completed" | "cancelled" | "refunded" | "modified";

interface UseBookingLifecycleOpts {
  provider?: any;
  services?: any[];
  queryKeys?: string[][];
}

export function useBookingLifecycle(opts: UseBookingLifecycleOpts = {}) {
  const { user, orgId } = useAuth();
  const qc = useQueryClient();
  const { provider, services = [], queryKeys = [["my_marketplace_bookings"]] } = opts;

  const invalidate = () => { queryKeys.forEach((key) => qc.invalidateQueries({ queryKey: key })); };
  const findService = (serviceId: string) => services.find((s: any) => s.id === serviceId);

  const buildMeta = async (booking: any, svc?: any) => {
    const { createDeepLinkMeta } = await import("@/lib/shared/notification-engine");
    return createDeepLinkMeta({ targetType: "marketplace_booking", targetId: booking.id, module: "marketplace" as const, countryCode: svc?.country || "", bookingId: booking.id, orgId: booking.org_id || orgId!, propertyId: booking.property_id });
  };

  const notify = async (booking: any, subject: string, message: string, category = "info", svc?: any) => {
    const { sendCommunicationEvent } = await import("@/lib/shared/communication-pipeline");
    const meta = await buildMeta(booking, svc);
    await sendCommunicationEvent({ orgId: booking.org_id || orgId!, senderId: provider?.user_id || user?.id, recipientEmail: booking.booker_email, subject, message, category, meta });
  };

  const updateStatus = async (booking: any, status: BookingStatus) => {
    const updates: Record<string, any> = { status };
    if (status === "cancelled") updates.cancelled_at = new Date().toISOString();
    if (status === "completed") updates.completed_at = new Date().toISOString();
    if (status === "confirmed") updates.confirmed_at = new Date().toISOString();
    if (status === "refunded") updates.refunded_at = new Date().toISOString();
    try {
      await dealRepo.updateMarketplaceBooking(booking.id, updates);
    } catch (e: any) { toast.error(e.message); return false; }

    const labels: Record<string, string> = { confirmed: "confirmée", cancelled: "annulée", completed: "terminée", refunded: "remboursée", awaiting_payment: "en attente de paiement" };
    toast.success(`Réservation ${labels[status] || status}`);
    invalidate();

    const eventMap: Record<string, any> = { confirmed: "marketplace:booking_confirmed", completed: "marketplace:booking_completed", cancelled: "marketplace:booking_cancelled" };
    if (eventMap[status]) platformBus.emit(eventMap[status], { bookingId: booking.id, status }, "marketplace", { userId: user?.id, orgId });

    try { const { resolveNotificationsForTarget } = await import("@/lib/shared/notification-engine"); await resolveNotificationsForTarget("marketplace_booking", booking.id, user?.id); } catch (e) { console.error("[resolve-notif]", e); }

    const svc = findService(booking.service_id);
    const statusEmoji: Record<string, string> = { confirmed: "✅", cancelled: "❌", completed: "✅", refunded: "💸", awaiting_payment: "⏳" };
    await notify(booking, `${statusEmoji[status] || "📋"} Booking ${status}: ${svc?.title || "Service"}`, `Hello ${booking.booker_name},\n\nYour booking for "${svc?.title || "Service"}" on ${booking.service_date || booking.date_from || "—"} has been ${status}.\nAmount: ${booking.total_price} ${booking.currency}\n\nThank you!`, status === "cancelled" ? "info" : "payment", svc);
    return true;
  };

  const confirmPayment = async (booking: any) => {
    try {
      await dealRepo.updateMarketplaceBooking(booking.id, { payment_confirmed: true, payment_confirmed_at: new Date().toISOString(), payment_method: "manual" });
    } catch (e: any) { toast.error(e.message); return false; }
    toast.success("Paiement confirmé !");
    invalidate();
    platformBus.emit("marketplace:booking_paid", { bookingId: booking.id, amount: booking.total_price, currency: booking.currency }, "marketplace", { userId: user?.id, orgId });
    const svc = findService(booking.service_id);
    await notify(booking, `💰 Payment confirmed: ${svc?.title || "Service"}`, `Hello ${booking.booker_name},\n\nYour payment of ${booking.total_price} ${booking.currency} for "${svc?.title || "Service"}" has been confirmed.\nDate: ${booking.service_date || booking.date_from || "—"}\n\nThank you!`, "payment", svc);
    return true;
  };

  const modifyBooking = async (booking: any, changes: { service_date: string; service_time: string; date_from: string | null; date_to: string | null; quantity: number; total_price: number; modification_reason: string }) => {
    try {
      await dealRepo.updateMarketplaceBooking(booking.id, { service_date: changes.service_date, service_time: changes.service_time, date_from: changes.date_from, date_to: changes.date_to, quantity: changes.quantity, total_price: changes.total_price, status: "modified" });
    } catch (e: any) { toast.error(e.message); return false; }
    toast.success("Réservation modifiée");
    invalidate();
    const svc = findService(booking.service_id);
    await notify(booking, `✏️ Booking modified: ${svc?.title || "Service"}`, `Hello ${booking.booker_name},\n\nYour booking for "${svc?.title || "Service"}" has been modified.\n\nNew date: ${changes.service_date || changes.date_from || "—"}\nNew amount: ${changes.total_price} ${booking.currency}\nReason: ${changes.modification_reason}\n\nPlease contact us if you have questions.`, "info", svc);
    return true;
  };

  const sendPaymentLink = async (booking: any) => {
    const svc = findService(booking.service_id);
    const link = svc?.payment_stripe_link || provider?.payment_stripe_link || svc?.payment_paypal_email || provider?.payment_paypal_email;
    if (!link) { toast.error("Aucun lien de paiement configuré"); return false; }
    window.open(`mailto:${booking.booker_email}?subject=Payment for ${svc?.title || "service"}&body=Please complete your payment: ${link}`, "_blank");
    await dealRepo.updateMarketplaceBooking(booking.id, { payment_link_sent: true });
    invalidate();
    await syncPaymentRequest({ type: "payment_request_sent", context: { orgId: booking.org_id || orgId!, bookingId: booking.id, propertyId: booking.property_id || undefined, countryCode: svc?.country || "" }, actorUserId: user?.id || "", targetEmail: booking.booker_email, amount: Number(booking.total_price), currency: booking.currency, description: `Payment for "${svc?.title || "Service"}" — ${link}`, recipientName: booking.booker_name });
    return true;
  };

  const sendQuote = async (booking: any, data: { quoted_price: number; quote_message: string }) => {
    try {
      await dealRepo.updateMarketplaceBooking(booking.id, { total_price: data.quoted_price, status: "awaiting_payment" });
    } catch (e: any) { toast.error(e.message); return false; }
    toast.success("Devis envoyé !");
    invalidate();
    const svc = findService(booking.service_id);
    await notify(booking, `💼 Quote for: ${svc?.title || "Service"}`, `Hello ${booking.booker_name},\n\nYou have received a quote for "${svc?.title || "Service"}".\n\nQuoted amount: ${data.quoted_price.toLocaleString()} ${booking.currency}\n${data.quote_message ? `\nMessage: ${data.quote_message}` : ""}\n\nPlease contact us to confirm or discuss.\n\nThank you!`, "payment", svc);
    return true;
  };

  const refundBooking = async (booking: any, reason = "") => {
    const bookingType = booking.service_id && booking.provider_id ? "marketplace" : "concierge";
    try {
      const refundResult = await dealRepo.invokeRefund(booking.id, bookingType, reason);
      if (refundResult?.error) { toast.error(`Refund error: ${refundResult.error}`); return false; }
      const status = refundResult?.refund_status;
      if (status === "stripe_failed") toast.warning("Stripe refund failed — booking marked as refunded.");
      else if (status === "manual") toast.success("Booking marked as refunded (non-Stripe payment).");
      else toast.success("Refund processed successfully via Stripe.");
    } catch (e: any) { toast.error("Refund failed. Please try again."); return false; }
    invalidate();
    try { const { resolveNotificationsForTarget } = await import("@/lib/shared/notification-engine"); await resolveNotificationsForTarget("marketplace_booking", booking.id, user?.id); } catch (e) { console.error("[resolve-notif]", e); }
    const svc = findService(booking.service_id);
    await notify(booking, `💸 Refund processed: ${svc?.title || "Service"}`, `Hello ${booking.booker_name},\n\nYour booking for "${svc?.title || "Service"}" has been refunded.\nAmount: ${booking.total_price} ${booking.currency}${reason ? `\nReason: ${reason}` : ""}\n\nThank you!`, "payment", svc);
    return true;
  };

  return {
    updateStatus, confirmPayment, sendPaymentLink, modifyBooking, sendQuote, refundBooking,
    updateStatusById: async (bookings: any[], id: string, status: BookingStatus) => { const b = bookings.find((b: any) => b.id === id); if (!b) { toast.error("Booking not found"); return false; } return updateStatus(b, status); },
    confirmPaymentById: async (bookings: any[], id: string) => { const b = bookings.find((b: any) => b.id === id); if (!b) { toast.error("Booking not found"); return false; } return confirmPayment(b); },
  };
}
