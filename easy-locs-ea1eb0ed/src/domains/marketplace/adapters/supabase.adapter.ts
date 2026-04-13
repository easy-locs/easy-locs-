/**
 * Marketplace Domain — Concrete adapters wiring existing repositories to DDD ports.
 */
import { v2db } from "@/lib/shared/db-v2";
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
    const { data } = await v2db("property_listings_v2")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return data ? mapListing(data) : null;
  },

  async findByOwner(ownerId: string): Promise<Listing[]> {
    const { data } = await v2db("property_listings_v2")
      .select("*")
      .eq("owner_user_id", ownerId)
      .order("created_at", { ascending: false });
    return (data ?? []).map(mapListing);
  },

  async search(query: SearchQuery): Promise<Listing[]> {
    let q = v2db("property_listings_v2").select("*").eq("status", "active");
    if (query.category) q = q.eq("category", query.category);
    if (query.city) q = q.ilike("city", `%${query.city}%`);
    if (query.country) q = q.eq("country", query.country);
    if (query.priceMin) q = q.gte("price", query.priceMin);
    if (query.priceMax) q = q.lte("price", query.priceMax);
    const { data } = await q.order("created_at", { ascending: false }).limit(query.limit ?? 50);
    return (data ?? []).map(mapListing);
  },

  async save(listing: Listing): Promise<void> {
    await v2db("property_listings_v2").upsert({
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
    });
    log.info("listing_saved", { listingId: listing.id });
  },

  async updateStatus(id: string, status: Listing["status"]): Promise<void> {
    await v2db("property_listings_v2").update({ status }).eq("id", id);
    log.info("listing_status_updated", { listingId: id, status });
  },
};

// ── Booking Adapter ──
export const bookingAdapter: BookingRepository = {
  async findById(id: string): Promise<Booking | null> {
    const { data } = await v2db("bookings_v2").select("*").eq("id", id).maybeSingle();
    return data ? mapBooking(data) : null;
  },

  async findByListing(listingId: string): Promise<Booking[]> {
    const { data } = await v2db("bookings_v2").select("*").eq("listing_id", listingId);
    return (data ?? []).map(mapBooking);
  },

  async findByBuyer(buyerId: string): Promise<Booking[]> {
    const { data } = await v2db("bookings_v2").select("*").eq("buyer_user_id", buyerId);
    return (data ?? []).map(mapBooking);
  },

  async save(booking: Booking): Promise<void> {
    await v2db("bookings_v2").upsert({
      id: booking.id,
      listing_id: booking.listingId,
      buyer_user_id: booking.buyerId,
      owner_user_id: booking.sellerId,
      amount: booking.amount.amount,
      currency: booking.amount.currency,
      status: booking.status,
      check_in: booking.checkIn,
      check_out: booking.checkOut,
    });
  },

  async updateStatus(id: string, status: Booking["status"]): Promise<void> {
    await v2db("bookings_v2").update({ status }).eq("id", id);
    log.info("booking_status_updated", { bookingId: id, status });
  },
};

// ── Row types ──
interface ListingRow {
  id: string;
  owner_user_id: string | null;
  title: string | null;
  description: string | null;
  price: number | null;
  currency: string | null;
  category: string | null;
  subcategory: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  country: string | null;
  status: string | null;
  media_urls: string[] | null;
  photo_urls: string[] | null;
  created_at: string;
}

interface BookingRow {
  id: string;
  listing_id: string;
  buyer_user_id: string;
  owner_user_id: string | null;
  owner_orbit_id: string | null;
  amount: number | null;
  currency: string | null;
  status: string | null;
  check_in: string | null;
  check_out: string | null;
  created_at: string;
}

// ── Mappers ──
function mapListing(row: ListingRow): Listing {
  return {
    id: row.id,
    ownerId: row.owner_user_id ?? "",
    title: row.title ?? "",
    description: row.description ?? "",
    price: { amount: row.price ?? 0, currency: row.currency ?? "XOF" },
    category: row.category ?? "",
    subcategory: row.subcategory ?? undefined,
    location: { lat: row.latitude ?? 0, lng: row.longitude ?? 0 },
    city: row.city ?? "",
    country: row.country ?? "",
    status: (row.status as Listing["status"]) ?? "draft",
    mediaUrls: row.media_urls ?? row.photo_urls ?? [],
    createdAt: row.created_at,
  };
}

function mapBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    listingId: row.listing_id,
    buyerId: row.buyer_user_id,
    sellerId: row.owner_user_id ?? row.owner_orbit_id ?? "",
    amount: { amount: row.amount ?? 0, currency: row.currency ?? "XOF" },
    status: (row.status as Booking["status"]) ?? "pending",
    checkIn: row.check_in ?? undefined,
    checkOut: row.check_out ?? undefined,
    createdAt: row.created_at,
  };
}

export { marketplaceEvents };
