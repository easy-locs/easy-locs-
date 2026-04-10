/**
 * Marketplace Domain — Port interfaces (hexagonal architecture).
 */
import type { Money, GeoPoint, DomainResult } from "../shared/types";

// ── Aggregates ──
export interface Listing {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  price: Money;
  category: string;
  subcategory?: string;
  location: GeoPoint;
  city: string;
  country: string;
  status: "draft" | "active" | "paused" | "sold" | "expired";
  mediaUrls: string[];
  createdAt: string;
}

export interface Booking {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  amount: Money;
  status: "pending" | "confirmed" | "paid" | "completed" | "cancelled";
  checkIn?: string;
  checkOut?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  bookingId: string;
  reviewerId: string;
  targetId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

// ── Inbound Ports ──
export interface MarketplaceUseCases {
  publishListing(cmd: PublishListingCommand): Promise<DomainResult<Listing>>;
  pauseListing(listingId: string): Promise<DomainResult<void>>;
  createBooking(cmd: CreateBookingCommand): Promise<DomainResult<Booking>>;
  confirmBooking(bookingId: string): Promise<DomainResult<Booking>>;
  submitReview(cmd: SubmitReviewCommand): Promise<DomainResult<Review>>;
  searchListings(query: SearchQuery): Promise<DomainResult<Listing[]>>;
}

export interface PublishListingCommand {
  ownerId: string;
  title: string;
  description: string;
  price: Money;
  category: string;
  location: GeoPoint;
  city: string;
  country: string;
  mediaUrls: string[];
}

export interface CreateBookingCommand {
  listingId: string;
  buyerId: string;
  checkIn?: string;
  checkOut?: string;
}

export interface SubmitReviewCommand {
  bookingId: string;
  reviewerId: string;
  rating: number;
  comment: string;
}

export interface SearchQuery {
  text?: string;
  category?: string;
  city?: string;
  country?: string;
  priceMin?: number;
  priceMax?: number;
  radius?: number;
  center?: GeoPoint;
  limit?: number;
  offset?: number;
}

// ── Outbound Ports ──
export interface ListingRepository {
  findById(id: string): Promise<Listing | null>;
  findByOwner(ownerId: string): Promise<Listing[]>;
  search(query: SearchQuery): Promise<Listing[]>;
  save(listing: Listing): Promise<void>;
  updateStatus(id: string, status: Listing["status"]): Promise<void>;
}

export interface BookingRepository {
  findById(id: string): Promise<Booking | null>;
  findByListing(listingId: string): Promise<Booking[]>;
  findByBuyer(buyerId: string): Promise<Booking[]>;
  save(booking: Booking): Promise<void>;
  updateStatus(id: string, status: Booking["status"]): Promise<void>;
}

export interface MarketplaceEventPort {
  listingPublished(listing: Listing): void;
  bookingCreated(booking: Booking): void;
  bookingConfirmed(booking: Booking): void;
  reviewSubmitted(review: Review): void;
}
