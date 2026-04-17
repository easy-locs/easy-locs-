/**
 * guest-portal.repository — All DB operations for GuestPortal page.
 */
import { db } from "@/services/db";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
export async function fetchGuestPortalData(bookingId: string) {
  const { data: b } = await cFrom("seasonal_bookings").select("*").eq("id", bookingId).maybeSingle();

  let bookingData: any = b;
  let source = "seasonal";

  if (!b) {
    const { data: br } = await cFrom("booking_requests").select("*").eq("id", bookingId).maybeSingle() as any;
    if (!br) return null;
    bookingData = br;
    source = "request";
  }

  const [{ data: p }, { data: svc }, { data: act }, { data: orgData }] = await Promise.all([
    cFrom("properties").select("*").eq("id", bookingData.property_id).maybeSingle(),
    cFrom("concierge_services_public").select("*").eq("org_id", bookingData.org_id).order("sort_order"),
    cFrom("activities_public").select("*").eq("org_id", bookingData.org_id).order("sort_order"),
    cFrom("orgs").select("name, email, phone, logo_url, brand_name").eq("id", bookingData.org_id).maybeSingle(),
  ]);

  return {
    booking: { ...bookingData, source },
    property: p,
    services: svc || [],
    activities: act || [],
    org: orgData,
  };
}

export async function createGuestOrder(booking: any, service: any) {
  const { error } = await cFrom("concierge_orders").insert({
    org_id: booking.org_id, service_id: service.id,
    property_id: booking.property_id, booking_id: booking.id,
    guest_name: booking.guest_name, guest_email: booking.guest_email || "",
    guest_phone: booking.guest_phone || "", quantity: 1,
    unit_price: service.price, total_price: service.price,
    currency: service.currency || "EUR", scheduled_at: booking.check_in,
    status: "pending", payment_status: "unpaid",
    notes: `Requested via Guest Portal for booking ${booking.id}`,
  } as any);
  if (error) throw error;
}

export async function notifyOrgOwner(orgId: string, title: string, body: string, category: string, route: string) {
  const { data } = await cFrom("orgs").select("owner_user_id").eq("id", orgId).single();
  const ownerId = (data as any)?.owner_user_id;
  if (!ownerId) return;
  await cFrom("app_notifications").insert({
    user_id: ownerId, scope: "global", category, title, body, severity: "info", route,
  });
}

export async function sendGuestEmail(orgEmail: string, guestName: string, guestEmail: string, message: string, propertyLabel: string, checkIn: string, checkOut: string) {
  const { error } = await db.functions.invoke("send-email", {
    body: {
      to: orgEmail,
      subject: `💬 Message from ${guestName}`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
        <h2 style="color:#1a1a1a;">💬 Guest Message</h2>
        <p style="background:#f5f5f5;padding:16px;border-radius:8px;color:#333;font-size:15px;">${message}</p>
        <p style="color:#888;font-size:13px;margin-top:12px;">From: ${guestName} (${guestEmail})<br/>
        Booking: ${checkIn} → ${checkOut}<br/>
        Property: ${propertyLabel}</p>
        <p style="text-align:center;color:#aaa;font-size:11px;margin-top:24px;">EASY-LOCS®</p>
      </div>`,
    },
  });
  if (error) console.warn("[guest-portal] guest message email failed", error);
}

export async function fetchGuestMessages(userId: string) {
  const { data } = await cFrom("app_notifications").select("*").eq("user_id", userId)
    .order("created_at", { ascending: true }).limit(50);
  return data || [];
}
