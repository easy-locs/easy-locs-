/**
 * Marketplace Domain — Concrete adapters wiring existing repositories to DDD ports.
 */
import type {
  ListingRepository, BookingRepository, MarketplaceEventPort,
  Listing, Booking, SearchQuery,
} from "../ports";
import { marketplaceEvents } from "../events";
import { createDomainLogger } from "../../shared/observability";
import * as mpRepo from "@/repositories/marketplace.repository";

const log = createDomainLogger("marketplace");

// ── Listing Adapter ──
export const listingAdapter: ListingRepository = {
  async findById(id: string): Promise<Listing | null> {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase
      .from("property_listings_v2")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return data ? mapListing(data) : null;
  },

  async findByOwner(ownerId: string): Promise<Listing[]> {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase
      .from("property_listings_v2")
      .select("*")
      .eq("owner_user_id", ownerId)
      .order("created_at", { ascending: false });
    return (data ?? []).map(mapListing);
  },

  async search(query: SearchQuery): Promise<Listing[]> {
    const { supabase } = await import("@/integrations/supabase/client");
    let q = supabase.from("property_listings_v2").select("*").eq("status", "active");
    if (query.category) q = q.eq("category", query.category);
    if (query.city) q = q.ilike("city", `%${query.city}%`);
    if (query.country) q = q.eq("country", query.country);
    if (query.priceMin) q = q.gte("price", query.priceMin);
    if (query.priceMax) q = q.lte("price", query.priceMax);
    const { data } = await q.order("created_at", { ascending: false }).limit(query.limit ?? 50);
    return (data ?? []).map(mapListing);
  },

  async save(listing: Listing): Promise<void> {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.from("property_listings_v2").upsert({
      id: listing.id,
      owner_user_id: listing.ownerId,
      title: listing.title,
      description: listing.description,
      price: listing.price.amount,
      currency: listing.price.currency,
      category: listing.category,
      city: listing.city,
      country: listing.country,
      status: listing.status,
    } as any);
    log.info("listing_saved", { listingId: listing.id });
  },

  async updateStatus(id: string, status: Listing["status"]): Promise<void> {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.from("property_listings_v2").update({ status } as any).eq("id", id);
    log.info("listing_status_updated", { listingId: id, status });
  },
};

// ── Booking Adapter ──
export const bookingAdapter: BookingRepository = {
  async findById(id: string): Promise<Booking | null> {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.from("bookings_v2").select("*").eq("id", id).maybeSingle();
    return data ? mapBooking(data) : null;
  },

  async findByListing(listingId: string): Promise<Booking[]> {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.from("bookings_v2").select("*").eq("listing_id", listingId);
    return (data ?? []).map(mapBooking);
  },

  async findByBuyer(buyerId: string): Promise<Booking[]> {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.from("bookings_v2").select("*").eq("buyer_user_id", buyerId);
    return (data ?? []).map(mapBooking);
  },

  async save(booking: Booking): Promise<void> {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.from("bookings_v2").upsert({
      id: booking.id,
      listing_id: booking.listingId,
      buyer_user_id: booking.buyerId,
      owner_user_id: booking.sellerId,
      amount: booking.amount.amount,
      currency: booking.amount.currency,
      status: booking.status,
      check_in: booking.checkIn,
      check_out: booking.checkOut,
    } as any);
  },

  async updateStatus(id: string, status: Booking["status"]): Promise<void> {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.from("bookings_v2").update({ status } as any).eq("id", id);
    log.info("booking_status_updated", { bookingId: id, status });
  },
};

// ── Mappers ──
function mapListing(row: any): Listing {
  return {
    id: row.id,
    ownerId: row.owner_user_id ?? "",
    title: row.title ?? "",
    description: row.description ?? "",
    price: { amount: row.price ?? 0, currency: row.currency ?? "XOF" },
    category: row.category ?? "",
    subcategory: row.subcategory,
    location: { lat: row.latitude ?? 0, lng: row.longitude ?? 0 },
    city: row.city ?? "",
    country: row.country ?? "",
    status: row.status ?? "draft",
    mediaUrls: row.media_urls ?? row.photo_urls ?? [],
    createdAt: row.created_at,
  };
}

function mapBooking(row: any): Booking {
  return {
    id: row.id,
    listingId: row.listing_id,
    buyerId: row.buyer_user_id,
    sellerId: row.owner_user_id ?? row.owner_orbit_id ?? "",
    amount: { amount: row.amount ?? 0, currency: row.currency ?? "XOF" },
    status: row.status ?? "pending",
    checkIn: row.check_in,
    checkOut: row.check_out,
    createdAt: row.created_at,
  };
}

export { marketplaceEvents };
