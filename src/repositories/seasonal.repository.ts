/**
 * seasonal.repository.ts — Single source of truth for ALL seasonal DB operations.
 * Replaces inline supabase in: useSeasonalData, useSeasonalBookings,
 * useSeasonalBookingRepository, useSeasonalBookingActions, useSeasonalRequestActions,
 * useICalService, ListingManager, PropertyPhotos, SeasonalShowcase.
 */
import { supabase } from "@/integrations/supabase/client";

// ─── Seasonal Bookings ───
export async function fetchSeasonalBookings(orgId: string) {
  const { data, error } = await supabase.from("seasonal_bookings").select("*").eq("org_id", orgId).order("check_in");
  if (error) throw error;
  return data ?? [];
}

export async function fetchPropertiesForSeasonal(orgId: string) {
  const { data } = await supabase.from("properties").select("id, label, photo_urls, city, country").eq("org_id", orgId).order("label");
  return data ?? [];
}

export async function fetchBookingRequests(orgId: string, limit = 50) {
  const { data } = await supabase.from("booking_requests").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(limit);
  return data ?? [];
}

export async function saveSeasonalBooking(record: Record<string, any>, editingId: string | null) {
  if (editingId) {
    const { error } = await supabase.from("seasonal_bookings").update(record as any).eq("id", editingId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("seasonal_bookings").insert({ ...record, status: "confirmed" } as any);
    if (error) throw error;
  }
}

export async function deleteSeasonalBooking(id: string) {
  await supabase.from("seasonal_bookings").delete().eq("id", id);
}

export async function insertSeasonalBookings(records: Record<string, any>[]) {
  const { error } = await supabase.from("seasonal_bookings").insert(records as any);
  if (error) throw error;
}

// ─── Booking Requests ───
export async function updateBookingRequestStatus(id: string, status: string) {
  await supabase.from("booking_requests").update({ status } as any).eq("id", id);
}

export async function deleteBookingRequest(id: string) {
  await supabase.from("booking_requests").delete().eq("id", id);
}

export async function fetchBookingRequest(id: string) {
  const { data } = await supabase.from("booking_requests").select("*").eq("id", id).single();
  return data;
}

export async function updateBookingRequestDates(id: string, checkIn: string, checkOut: string) {
  const { error } = await supabase.from("booking_requests").update({ check_in: checkIn, check_out: checkOut } as any).eq("id", id);
  if (error) throw error;
}

export async function updateSeasonalBookingDates(orgId: string, guestEmail: string, oldCheckIn: string, checkIn: string, checkOut: string) {
  await supabase.from("seasonal_bookings").update({ check_in: checkIn, check_out: checkOut } as any)
    .eq("org_id", orgId).eq("guest_email", guestEmail).eq("check_in", oldCheckIn);
}

export async function deleteSeasonalBookingByMatch(orgId: string, propertyId: string, checkIn: string, checkOut: string, guestName: string) {
  await supabase.from("seasonal_bookings").delete()
    .eq("org_id", orgId).eq("property_id", propertyId)
    .eq("check_in", checkIn).eq("check_out", checkOut)
    .eq("guest_name", guestName);
}

// ─── Listings ───
export async function fetchListingByProperty(orgId: string, propertyId: string) {
  const { data } = await supabase.from("public_listings").select("*").eq("org_id", orgId).eq("property_id", propertyId).maybeSingle();
  return data;
}

export async function fetchListingById(id: string) {
  const { data } = await supabase.from("public_listings").select("*").eq("id", id).single();
  return data;
}

export async function upsertListing(record: Record<string, any>, existingId?: string) {
  if (existingId) {
    const { error } = await supabase.from("public_listings").update(record as any).eq("id", existingId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("public_listings").insert(record as any);
    if (error) throw error;
  }
}

export async function toggleListingActive(listingId: string, active: boolean) {
  await supabase.from("public_listings").update({ active } as any).eq("id", listingId);
}

export async function fetchAllListingsWithProperties(orgId: string) {
  const { data } = await supabase.from("public_listings").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
  return data ?? [];
}

// ─── Org Info ───
export async function fetchOrgForNotification(orgId: string) {
  const { data } = await supabase.from("orgs").select("owner_user_id, email, name").eq("id", orgId).single();
  return data;
}

// ─── Email ───
export async function invokeSendEmail(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("send-email", { body });
  if (error) throw error;
  return data;
}

// ─── Booking Payment ───
export async function invokeBookingPayment(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("create-booking-payment", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// ─── Photo Upload ───
export async function uploadPropertyPhoto(orgId: string, propertyId: string, file: File) {
  const ext = file.name.split(".").pop();
  const path = `${orgId}/${propertyId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("property-photos").upload(path, file);
  if (error) throw error;
  const { data: urlData } = supabase.storage.from("property-photos").getPublicUrl(path);
  return urlData.publicUrl;
}

export async function deletePropertyPhoto(url: string) {
  const path = url.split("/property-photos/")[1];
  if (path) await supabase.storage.from("property-photos").remove([path]);
}

// ─── Realtime ───
export function subscribeToBookingRequests(orgId: string, onEvent: () => void) {
  const channel = supabase
    .channel("seasonal-rt")
    .on("postgres_changes", { event: "*", schema: "public", table: "booking_requests", filter: `org_id=eq.${orgId}` }, onEvent)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// ─── Analytics ───
export async function fetchSeasonalBookingsForAnalytics(orgId: string) {
  const { data } = await supabase.from("seasonal_bookings").select("property_id, check_in, check_out, total_price, status").eq("org_id", orgId);
  return data ?? [];
}

export async function fetchBookingRequestsForListings(listingIds: string[]) {
  if (listingIds.length === 0) return [];
  const { data } = await supabase.from("booking_requests").select("listing_id, check_in, check_out, guest_name, status").in("listing_id", listingIds);
  return data ?? [];
}
