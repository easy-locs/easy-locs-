/**
 * public.repository — All DB ops for public/SEO pages & landing.
 */
import { db } from "@/services/db";

// ── SEO city/category ──
export async function fetchPublicMarketplaceServices(params: Record<string, any>) {
  const { data } = await db.rpc("get_public_marketplace_services" as any, params);
  return data ?? [];
}

export async function fetchPublicRealEstateListings(params: Record<string, any>) {
  const { data } = await db.rpc("get_public_real_estate_listings" as any, params);
  return data ?? [];
}

export async function fetchPublicListings(filters?: Record<string, any>) {
  let q = db("public_listings").select("*").eq("active", true);
  if (filters?.limit) q = q.limit(filters.limit);
  const { data } = await q.order("created_at", { ascending: false });
  return data ?? [];
}

export async function fetchPublicProviders(params: Record<string, any>) {
  const { data } = await db.rpc("get_public_marketplace_providers" as any, params);
  return data ?? [];
}

// ── Newsletter ──
export async function insertNewsletterSubscriber(email: string) {
  const { error } = await db("newsletter_subscribers").insert({ email });
  if (error) throw error;
}

// ── Booking form ──
export async function insertBookingRequest(record: Record<string, any>) {
  const { error } = await db("booking_requests").insert(record);
  if (error) throw error;
}

// ── Listing contact ──
export async function fetchListingContact(listingId: string) {
  const { data } = await db("public_listings").select("property_id, org_id").eq("id", listingId).single();
  return data;
}

// ── Real estate photo ──
export async function uploadRealEstatePhoto(path: string, file: File) {
  const { error } = await db.storage.from("property-photos").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = db.storage.from("property-photos").getPublicUrl(path);
  return data.publicUrl;
}

// ── QR ──
export async function resolveQrCode(code: string) {
  const { data } = await db("qr_codes" as any).select("*").eq("code", code).single();
  return data;
}

// ── Saved listings ──
export async function fetchSavedListings(userId: string) {
  const { data } = await db("saved_listings").select("*, public_listings(*)").eq("user_id", userId);
  return data ?? [];
}

export async function insertSavedListing(record: Record<string, any>) {
  const { error } = await db("saved_listings").insert(record);
  if (error) throw error;
}

export async function deleteSavedListing(userId: string, listingId: string) {
  const { error } = await db("saved_listings").delete().eq("user_id", userId).eq("listing_id", listingId);
  if (error) throw error;
}

// ── Referrals ──
export async function fetchReferralCode(userId: string) {
  const { data } = await db("profiles").select("referral_code").eq("id", userId).single();
  return (data as any)?.referral_code ?? null;
}

export async function fetchReferralStats(userId: string) {
  const { data } = await db("referral_rewards").select("*").eq("referrer_user_id", userId);
  return data ?? [];
}

// ── Merchant claim ──
export async function claimMerchant(merchantId: string, userId: string) {
  const { error } = await db("auto_discovered_merchants").update({ claimed_by: userId, claimed_at: new Date().toISOString(), claim_status: "claimed" }).eq("id", merchantId);
  if (error) throw error;
}

export async function fetchSeedMerchant() {
  const { data } = await db("seed_merchants" as any).select("id").limit(1).maybeSingle();
  return data;
}

// ── Merchant orders ──
export async function fetchMerchantOrders(shopId: string) {
  const { data } = await db("storefront_orders").select("*").eq("shop_id", shopId).order("created_at", { ascending: false }).limit(200);
  return data ?? [];
}

export async function fetchOrderItems(limit = 5000) {
  const { data } = await db("order_items").select("*").limit(limit);
  return data ?? [];
}

// ── Live tracking ──
export async function fetchTrackingData(jobId: string) {
  const { data } = await db("mobility_jobs").select("*").eq("id", jobId).single();
  return data;
}

export function subscribeToJob(jobId: string, onUpdate: (payload: any) => void) {
  const { createRealtimeChannel, removeRealtimeChannel } = require("@/lib/realtime");
  const channel = createRealtimeChannel(`tracking-${jobId}`)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "mobility_jobs", filter: `id=eq.${jobId}` }, onUpdate)
    .subscribe();
  return () => { removeRealtimeChannel(channel); };
}
