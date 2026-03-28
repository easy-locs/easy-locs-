/**
 * booking.repository — All booking/service DB operations.
 * Single source for concierge_orders, marketplace_bookings reads/writes.
 */
import { supabase } from "@/integrations/supabase/client";

export interface BookingOrderPayload {
  org_id: string;
  service_id: string;
  property_id?: string | null;
  property_label?: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  notes?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  currency: string;
  customer_currency?: string;
  exchange_rate?: number;
  service_date: string;
  end_time?: string | null;
  service_time?: string | null;
  payment_method: string;
  status?: string;
  payment_status?: string;
  commission_type?: string;
  commission_rate?: number;
  commission_amount?: number;
  document_urls?: string[];
}

export interface MarketplaceBookingPayload {
  service_id: string;
  provider_id: string;
  org_id: string;
  booker_name: string;
  booker_email: string;
  booker_phone?: string;
  service_date: string;
  service_time?: string | null;
  quantity: number;
  total_price: number;
  currency: string;
  customer_currency?: string;
  exchange_rate?: number;
  notes?: string;
  date_from?: string | null;
  date_to?: string | null;
  payment_method: string;
  status?: string;
}

/** Create a concierge order */
export async function createConciergeOrder(data: BookingOrderPayload) {
  const { data: order, error } = await supabase
    .from("concierge_orders")
    .insert(data as any)
    .select()
    .single();
  if (error) throw error;
  return order;
}

/** Create a marketplace booking */
export async function createMarketplaceBooking(data: MarketplaceBookingPayload) {
  const { error } = await supabase
    .from("marketplace_bookings")
    .insert(data as any);
  if (error) throw error;
}

/** Check service availability via RPC */
export async function checkServiceAvailability(serviceId: string, dateFrom: string, dateTo: string | null) {
  const { data } = await supabase.rpc("check_service_availability", {
    p_service_id: serviceId,
    p_date_from: dateFrom,
    p_date_to: dateTo,
  });
  return data;
}

/** Invoke booking notification email */
export async function sendBookingNotificationEmail(params: {
  orgId: string;
  guestName: string;
  guestEmail: string;
  serviceTitle: string;
  serviceDate: string;
  totalPrice: string;
  currency: string;
}) {
  try {
    await supabase.functions.invoke("send-notification-email", {
      body: {
        event_type: "booking_request",
        recipient_email: null,
        org_id: params.orgId,
        data: {
          guest_name: params.guestName,
          guest_email: params.guestEmail,
          service_title: params.serviceTitle,
          service_date: params.serviceDate,
          total_price: params.totalPrice,
          currency: params.currency,
        },
        locale: "en",
      },
    });
  } catch (e) {
    console.error("[booking.repository] notification email error:", e);
  }
}

/** Create concierge payment checkout */
export async function createConciergePaymentCheckout(params: {
  orderId: string;
  serviceId: string;
  amount: number;
  currency: string;
  guestEmail: string;
  guestName: string;
  serviceTitle: string;
  origin: string;
  bookingSlug: string;
}) {
  const { data, error } = await supabase.functions.invoke("create-concierge-payment", {
    body: {
      order_id: params.orderId,
      service_id: params.serviceId,
      amount: params.amount,
      currency: params.currency,
      guest_email: params.guestEmail,
      guest_name: params.guestName,
      service_title: params.serviceTitle,
      origin: params.origin,
      booking_slug: params.bookingSlug,
    },
  });
  if (error) throw error;
  return data;
}

/** Fetch a public service by slug */
export async function fetchServiceBySlug(slug: string) {
  const normalizedSlug = decodeURIComponent(slug).trim();

  // Try exact match on concierge
  const { data: exactMatch } = await supabase
    .from("concierge_services_public" as any)
    .select("*")
    .eq("booking_slug", normalizedSlug)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (exactMatch) return { ...(exactMatch as any), _source: "concierge" };

  // Try ilike on concierge
  const { data: fallbackMatch } = await supabase
    .from("concierge_services_public" as any)
    .select("*")
    .ilike("booking_slug", normalizedSlug)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fallbackMatch) return { ...(fallbackMatch as any), _source: "concierge" };

  // Try marketplace
  const { data: mpExact } = await supabase
    .from("marketplace_services_public" as any)
    .select("*")
    .eq("booking_slug", normalizedSlug)
    .limit(1)
    .maybeSingle();

  if (mpExact) return { ...(mpExact as any), _source: "marketplace" };

  const { data: mpFallback } = await supabase
    .from("marketplace_services_public" as any)
    .select("*")
    .ilike("booking_slug", normalizedSlug)
    .limit(1)
    .maybeSingle();

  if (mpFallback) return { ...(mpFallback as any), _source: "marketplace" };

  return null;
}
