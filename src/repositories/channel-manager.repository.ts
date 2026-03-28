/**
 * channel-manager.repository — All DB operations for ChannelManager page.
 * Single source for OTA connections, reservations, and sync operations.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchOrgForUser(userId: string) {
  const { data } = await supabase.from("org_members").select("org_id").eq("user_id", userId).limit(1).single();
  if (!data) return null;
  const { data: o } = await supabase.from("orgs").select("*").eq("id", data.org_id).single();
  return o;
}

export async function fetchProperties(orgId: string) {
  const { data } = await supabase.from("properties").select("id, label, city, country").eq("org_id", orgId);
  return data || [];
}

export async function fetchOtaConnections(orgId: string) {
  const { data } = await supabase.rpc("get_ota_connections", { _org_id: orgId });
  return (data || []) as Array<{
    id: string; provider: string; status: string; last_sync_at: string | null;
    linked_properties: any; created_at: string;
  }>;
}

export async function fetchPricingRules(orgId: string) {
  const { data } = await supabase.from("pricing_rules").select("*").eq("org_id", orgId).eq("active", true);
  return data || [];
}

export async function fetchChannelReservations(orgId: string) {
  const [{ data: seasonalData }, { data: requestsData }] = await Promise.all([
    supabase.from("seasonal_bookings").select("*").eq("org_id", orgId),
    supabase.from("booking_requests").select("*").eq("org_id", orgId),
  ]);

  const seasonal = (seasonalData || []).map((b: any) => ({
    id: b.id, property_id: b.property_id, guest_name: b.guest_name,
    guest_email: b.guest_email || "", check_in: b.check_in, check_out: b.check_out,
    status: b.status || "confirmed", ota_provider: "direct",
    amount: Number(b.total_price) || 0, source_table: "seasonal_bookings" as const,
  }));

  const requests = (requestsData || [])
    .filter((r: any) => ["paid", "approved", "confirmed", "pending", "payment_pending"].includes(r.status))
    .map((r: any) => ({
      id: r.id, property_id: r.property_id, guest_name: r.guest_name,
      guest_email: r.guest_email || "", check_in: r.check_in, check_out: r.check_out,
      status: r.status, ota_provider: "direct", amount: 0,
      source_table: "booking_requests" as const,
    }));

  const seen = new Set<string>();
  return [...seasonal, ...requests].filter(r => {
    const key = `${r.property_id}-${r.check_in}-${r.check_out}-${r.guest_name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function syncIcal(conn: any, orgId: string) {
  const res = await supabase.functions.invoke("sync-ical", {
    body: {
      ical_url: conn.linked_properties?.[0]?.ical_url || "",
      property_id: conn.linked_properties?.[0]?.property_id || "",
      provider: conn.provider,
      org_id: orgId,
    },
  });
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function addOtaConnection(orgId: string, userId: string, provider: string, icalUrl: string, propertyId: string) {
  const { error } = await supabase.from("ota_connections").insert({
    org_id: orgId, user_id: userId, provider,
    status: "active", linked_properties: [{ property_id: propertyId, ical_url: icalUrl }],
  });
  if (error) throw error;
}

export async function deleteOtaConnection(id: string) {
  const { error } = await supabase.from("ota_connections").delete().eq("id", id);
  if (error) throw error;
}

export async function cancelReservation(res: { id: string; source_table: string; property_id: string; check_in: string; check_out: string; guest_name: string; guest_email?: string }, orgId: string) {
  if (res.source_table === "seasonal_bookings") {
    await supabase.from("seasonal_bookings").update({ status: "cancelled" } as any).eq("id", res.id);
  } else {
    await supabase.from("booking_requests").update({ status: "cancelled" } as any).eq("id", res.id);
    await supabase.from("seasonal_bookings").delete()
      .eq("org_id", orgId).eq("property_id", res.property_id)
      .eq("check_in", res.check_in).eq("check_out", res.check_out)
      .eq("guest_name", res.guest_name);
  }

  if (res.guest_email) {
    await supabase.functions.invoke("send-email", {
      body: {
        to: res.guest_email,
        subject: `🚫 Réservation annulée — ${res.check_in} → ${res.check_out}`,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
          <h2 style="color:#dc2626;text-align:center;">🚫 Réservation annulée</h2>
          <p style="color:#555;font-size:15px;text-align:center;">Bonjour ${res.guest_name},<br/>Votre réservation du ${res.check_in} au ${res.check_out} a été annulée.</p>
          <p style="text-align:center;color:#aaa;font-size:11px;margin-top:24px;">EASY-LOCS®</p>
        </div>`,
      },
    });
  }
}

export async function notifyOwner(userId: string, title: string, body: string, route: string) {
  await (supabase as any).from("app_notifications").insert({
    user_id: userId, scope: "global", category: "info", title, body, severity: "info", route,
  });
}

export async function modifyReservationDates(
  res: { id: string; source_table: string; property_id: string; guest_name: string; guest_email?: string; check_in: string; check_out: string },
  newCheckIn: string, newCheckOut: string, orgId: string
) {
  if (res.source_table === "seasonal_bookings") {
    await supabase.from("seasonal_bookings").update({ check_in: newCheckIn, check_out: newCheckOut } as any).eq("id", res.id);
  } else {
    await supabase.from("booking_requests").update({ check_in: newCheckIn, check_out: newCheckOut } as any).eq("id", res.id);
    await supabase.from("seasonal_bookings").update({ check_in: newCheckIn, check_out: newCheckOut } as any)
      .eq("org_id", orgId).eq("property_id", res.property_id)
      .eq("check_in", res.check_in).eq("check_out", res.check_out)
      .eq("guest_name", res.guest_name);
  }

  if (res.guest_email) {
    await supabase.functions.invoke("send-email", {
      body: {
        to: res.guest_email,
        subject: `📅 Dates modifiées — ${newCheckIn} → ${newCheckOut}`,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
          <h2 style="color:#1a1a1a;text-align:center;">📅 Dates de réservation modifiées</h2>
          <p style="color:#555;font-size:15px;text-align:center;">Bonjour ${res.guest_name},<br/>
          Vos nouvelles dates : du <strong>${newCheckIn}</strong> au <strong>${newCheckOut}</strong>.</p>
          <p style="text-align:center;color:#aaa;font-size:11px;margin-top:24px;">EASY-LOCS®</p>
        </div>`,
      },
    });
  }
}
