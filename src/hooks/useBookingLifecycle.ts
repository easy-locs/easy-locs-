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

  // ─── Send Payment Link ───
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

  return {
    updateStatus,
    confirmPayment,
    sendPaymentLink,
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
