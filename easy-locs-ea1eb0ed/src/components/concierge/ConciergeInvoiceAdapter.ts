/**
 * Concierge Invoice Adapter
 * Maps concierge_orders + concierge_services data to the InvoicePdfGenerator format.
 */
import { generateInvoicePdf } from "@/components/marketplace/InvoicePdfGenerator";
import { db } from "@/services/db";
import { toast } from "sonner";

/**
 * Generate a professional invoice for a concierge booking.
 * Fetches provider profile and maps concierge fields to the marketplace invoice format.
 */
export async function generateConciergeInvoice(booking: any, service: any, orgId: string): Promise<Blob | null> {
  // Fetch provider profile for invoicing details
  const { data: provider } = await db
    .from("marketplace_providers")
    .select("*")
    .eq("org_id", orgId)
    .limit(1)
    .maybeSingle();

  if (!provider) {
    toast.error("Please set up your provider profile first to generate invoices.");
    return null;
  }

  // Map concierge_orders fields → marketplace invoice format
  const mappedBooking = {
    id: booking.id,
    booker_name: booking.guest_name || "Guest",
    booker_email: booking.guest_email || "",
    booker_phone: booking.guest_phone || "",
    total_price: booking.total_price || 0,
    currency: booking.currency || "EUR",
    quantity: booking.quantity || 1,
    service_date: booking.service_date,
    service_time: booking.service_time,
    date_from: booking.service_date,
    date_to: booking.end_time,
    payment_confirmed: booking.payment_status === "paid",
    payment_confirmed_at: booking.payment_status === "paid" ? (booking.confirmed_at || booking.updated_at) : null,
    payment_method: booking.payment_method || "",
    notes: booking.notes || "",
    country: service?.country || "",
    customer_country: booking.customer_currency ? "" : "",
  };

  const mappedService = {
    title: service?.title || "Concierge Service",
    city: service?.city || "",
    country: service?.country || "",
    price: service?.price || booking.unit_price || booking.total_price,
    category: service?.category || "concierge",
  };

  return generateInvoicePdf({
    booking: mappedBooking,
    service: mappedService,
    provider,
  });
}
