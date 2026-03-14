/**
 * useBookingLifecycle — centralized hook for marketplace booking operations.
 * Handles: status transitions, payment confirmation, payment link sending,
 * notification dispatch, and audit logging.
 *
 * Used by: ActivitiesMarketplace, BookingDetailDrawer, BookingRequestCenter, CommunicationCenter
 */
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { syncPaymentRequest } from "@/lib/shared/sync-engine";
import { platformBus } from "@/lib/shared/platform-bus";

export type BookingStatus =
  | "pending" | "new" | "awaiting_payment"
  | "confirmed" | "completed" | "cancelled" | "refunded" | "modified";

interface UseBookingLifecycleOpts {
  /** Provider record (for payment links, user_id, etc.) */
  provider?: any;
  /** Services list to look up service by id */
  services?: any[];
  /** React-Query keys to invalidate after mutations */
  queryKeys?: string[][];
}

export function useBookingLifecycle(opts: UseBookingLifecycleOpts = {}) {
  const { user, orgId } = useAuth();
  const qc = useQueryClient();
  const { provider, services = [], queryKeys = [["my_marketplace_bookings"]] } = opts;

  const invalidate = () => {
    queryKeys.forEach((key) => qc.invalidateQueries({ queryKey: key }));
  };

  const findService = (serviceId: string) =>
    services.find((s: any) => s.id === serviceId);

  /** Build deep-link meta for a booking */
  const buildMeta = async (booking: any, svc?: any) => {
    const { createDeepLinkMeta } = await import("@/lib/shared/notification-engine");
    return createDeepLinkMeta({
      targetType: "marketplace_booking",
      targetId: booking.id,
      module: "marketplace" as const,
      countryCode: svc?.country || "",
      bookingId: booking.id,
      orgId: booking.org_id || orgId!,
      propertyId: booking.property_id,
    });
  };

  /** Send a communication event (email + in-app notification + message) */
  const notify = async (
    booking: any,
    subject: string,
    message: string,
    category: string = "info",
    svc?: any,
  ) => {
    const { sendCommunicationEvent } = await import("@/lib/shared/communication-pipeline");
    const meta = await buildMeta(booking, svc);
    await sendCommunicationEvent({
      orgId: booking.org_id || orgId!,
      senderId: provider?.user_id || user?.id,
      recipientEmail: booking.booker_email,
      subject,
      message,
      category,
      meta,
    });
  };

  // ─── Status Update ───
  const updateStatus = async (booking: any, status: BookingStatus) => {
    const updates: Record<string, any> = { status };
    if (status === "cancelled") updates.cancelled_at = new Date().toISOString();
    if (status === "completed") updates.completed_at = new Date().toISOString();
    if (status === "confirmed") updates.confirmed_at = new Date().toISOString();
    if (status === "refunded") updates.refunded_at = new Date().toISOString();

    const { error } = await supabase
      .from("marketplace_bookings")
      .update(updates)
      .eq("id", booking.id);
    if (error) { toast.error(error.message); return false; }

    const labels: Record<string, string> = {
      confirmed: "confirmée", cancelled: "annulée", completed: "terminée", refunded: "remboursée",
      awaiting_payment: "en attente de paiement",
    };
    toast.success(`Réservation ${labels[status] || status}`);
    invalidate();

    // Emit platform bus events
    const eventMap: Record<string, any> = {
      confirmed: "marketplace:booking_confirmed",
      completed: "marketplace:booking_completed",
      cancelled: "marketplace:booking_cancelled",
    };
    if (eventMap[status]) {
      platformBus.emit(eventMap[status], { bookingId: booking.id, status }, "marketplace", { userId: user?.id, orgId });
    }

    // Resolve notifications
    try {
      const { resolveNotificationsForTarget } = await import("@/lib/shared/notification-engine");
      await resolveNotificationsForTarget("marketplace_booking", booking.id, user?.id);
    } catch (e) { console.error("[resolve-notif]", e); }

    // Notify customer
    const svc = findService(booking.service_id);
    const statusEmoji: Record<string, string> = {
      confirmed: "✅", cancelled: "❌", completed: "✅", refunded: "💸", awaiting_payment: "⏳",
    };
    await notify(
      booking,
      `${statusEmoji[status] || "📋"} Booking ${status}: ${svc?.title || "Service"}`,
      `Hello ${booking.booker_name},\n\nYour booking for "${svc?.title || "Service"}" on ${booking.service_date || booking.date_from || "—"} has been ${status}.\nAmount: ${booking.total_price} ${booking.currency}\n\nThank you!`,
      status === "cancelled" ? "info" : "payment",
      svc,
    );

    return true;
  };

  // ─── Confirm Payment ───
  const confirmPayment = async (booking: any) => {
    const { error } = await supabase
      .from("marketplace_bookings")
      .update({
        payment_confirmed: true,
        payment_confirmed_at: new Date().toISOString(),
        payment_method: "manual",
      })
      .eq("id", booking.id);
    if (error) { toast.error(error.message); return false; }

    toast.success("Paiement confirmé !");
    invalidate();

    const svc = findService(booking.service_id);
    await notify(
      booking,
      `💰 Payment confirmed: ${svc?.title || "Service"}`,
      `Hello ${booking.booker_name},\n\nYour payment of ${booking.total_price} ${booking.currency} for "${svc?.title || "Service"}" has been confirmed.\nDate: ${booking.service_date || booking.date_from || "—"}\n\nThank you!`,
      "payment",
      svc,
    );

    return true;
  };

  // ─── Modify Booking ───
  const modifyBooking = async (
    booking: any,
    changes: {
      service_date: string;
      service_time: string;
      date_from: string | null;
      date_to: string | null;
      quantity: number;
      total_price: number;
      modification_reason: string;
    },
  ) => {
    const updates: Record<string, any> = {
      service_date: changes.service_date,
      service_time: changes.service_time,
      date_from: changes.date_from,
      date_to: changes.date_to,
      quantity: changes.quantity,
      total_price: changes.total_price,
      status: "modified",
    };

    const { error } = await supabase
      .from("marketplace_bookings")
      .update(updates)
      .eq("id", booking.id);
    if (error) { toast.error(error.message); return false; }

    toast.success("Réservation modifiée");
    invalidate();

    const svc = findService(booking.service_id);
    await notify(
      booking,
      `✏️ Booking modified: ${svc?.title || "Service"}`,
      `Hello ${booking.booker_name},\n\nYour booking for "${svc?.title || "Service"}" has been modified.\n\nNew date: ${changes.service_date || changes.date_from || "—"}\nNew amount: ${changes.total_price} ${booking.currency}\nReason: ${changes.modification_reason}\n\nPlease contact us if you have questions.`,
      "info",
      svc,
    );

    return true;
  };


  const sendPaymentLink = async (booking: any) => {
    const svc = findService(booking.service_id);
    const link =
      svc?.payment_stripe_link || provider?.payment_stripe_link ||
      svc?.payment_paypal_email || provider?.payment_paypal_email;

    if (!link) {
      toast.error("Aucun lien de paiement configuré");
      return false;
    }

    window.open(
      `mailto:${booking.booker_email}?subject=Payment for ${svc?.title || "service"}&body=Please complete your payment: ${link}`,
      "_blank",
    );

    await supabase
      .from("marketplace_bookings")
      .update({ payment_link_sent: true })
      .eq("id", booking.id);
    invalidate();

    // Sync engine: payment_request_sent
    await syncPaymentRequest({
      type: "payment_request_sent",
      context: {
        orgId: booking.org_id || orgId!,
        bookingId: booking.id,
        propertyId: booking.property_id || undefined,
        countryCode: svc?.country || "",
      },
      actorUserId: user?.id || "",
      targetEmail: booking.booker_email,
      amount: Number(booking.total_price),
      currency: booking.currency,
      description: `Payment for "${svc?.title || "Service"}" — ${link}`,
      recipientName: booking.booker_name,
    });

    return true;
  };

  // ─── Send Quote ───
  const sendQuote = async (
    booking: any,
    data: { quoted_price: number; quote_message: string },
  ) => {
    const { error } = await supabase
      .from("marketplace_bookings")
      .update({
        total_price: data.quoted_price,
        status: "awaiting_payment",
      })
      .eq("id", booking.id);
    if (error) { toast.error(error.message); return false; }

    toast.success("Devis envoyé !");
    invalidate();

    const svc = findService(booking.service_id);
    await notify(
      booking,
      `💼 Quote for: ${svc?.title || "Service"}`,
      `Hello ${booking.booker_name},\n\nYou have received a quote for "${svc?.title || "Service"}".\n\nQuoted amount: ${data.quoted_price.toLocaleString()} ${booking.currency}\n${data.quote_message ? `\nMessage: ${data.quote_message}` : ""}\n\nPlease contact us to confirm or discuss.\n\nThank you!`,
      "payment",
      svc,
    );

    return true;
  };

  // ─── Refund Booking (L2.8) — Automated Stripe Refund ───
  const refundBooking = async (booking: any, reason: string = "") => {
    const bookingType = booking.service_id && booking.provider_id ? "marketplace" : "concierge";

    // Attempt automated refund via Edge Function
    try {
      const { data: refundResult, error: fnError } = await supabase.functions.invoke("process-refund", {
        body: { booking_id: booking.id, booking_type: bookingType, reason },
      });

      if (fnError) {
        console.error("[refund] Edge function error:", fnError);
        toast.error(`Refund error: ${fnError.message}`);
        return false;
      }

      if (refundResult?.error) {
        console.error("[refund] Server error:", refundResult.error);
        toast.error(`Refund error: ${refundResult.error}`);
        return false;
      }

      const status = refundResult?.refund_status;
      if (status === "stripe_failed") {
        toast.warning("Stripe refund failed — booking marked as refunded. Please process the refund manually in your Stripe dashboard.");
      } else if (status === "manual") {
        toast.success("Booking marked as refunded (non-Stripe payment — refund manually).");
      } else {
        toast.success("Refund processed successfully via Stripe.");
      }
    } catch (e) {
      console.error("[refund] Unexpected error:", e);
      toast.error("Refund failed. Please try again.");
      return false;
    }

    invalidate();

    // Resolve notifications
    try {
      const { resolveNotificationsForTarget } = await import("@/lib/shared/notification-engine");
      await resolveNotificationsForTarget("marketplace_booking", booking.id, user?.id);
    } catch (e) { console.error("[resolve-notif]", e); }

    const svc = findService(booking.service_id);
    await notify(
      booking,
      `💸 Refund processed: ${svc?.title || "Service"}`,
      `Hello ${booking.booker_name},\n\nYour booking for "${svc?.title || "Service"}" has been refunded.\nAmount: ${booking.total_price} ${booking.currency}${reason ? `\nReason: ${reason}` : ""}\n\nThe refund will be processed according to the original payment method.\n\nThank you!`,
      "payment",
      svc,
    );

    return true;
  };

  return {
    updateStatus,
    confirmPayment,
    sendPaymentLink,
    modifyBooking,
    sendQuote,
    refundBooking,
    /** Convenience: update by ID (finds booking in provided list) */
    updateStatusById: async (bookings: any[], id: string, status: BookingStatus) => {
      const booking = bookings.find((b: any) => b.id === id);
      if (!booking) { toast.error("Booking not found"); return false; }
      return updateStatus(booking, status);
    },
    confirmPaymentById: async (bookings: any[], id: string) => {
      const booking = bookings.find((b: any) => b.id === id);
      if (!booking) { toast.error("Booking not found"); return false; }
      return confirmPayment(booking);
    },
  };
}
