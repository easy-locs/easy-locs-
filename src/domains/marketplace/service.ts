/**
 * Marketplace Domain Service — Use-case implementations.
 */
import type { MarketplaceUseCases, PublishListingCommand, CreateBookingCommand, SubmitReviewCommand, SearchQuery } from "./ports";
import { listingAdapter, bookingAdapter } from "./adapters/supabase.adapter";
import { marketplaceEvents } from "./events";
import { createDomainLogger } from "../shared/observability";
import { requireAuth, rateLimit, sanitize, type SecurityContext } from "../shared/security-guards";

const log = createDomainLogger("marketplace");

export function createMarketplaceService(ctx: SecurityContext | null): MarketplaceUseCases {
  return {
    async publishListing(cmd: PublishListingCommand) {
      requireAuth(ctx);
      rateLimit(`publish:${cmd.ownerId}`, 10);
      const timer = log.timed("publish_listing", { ownerId: cmd.ownerId });

      try {
        const listing = {
          id: crypto.randomUUID(),
          ownerId: cmd.ownerId,
          title: sanitize(cmd.title),
          description: sanitize(cmd.description),
          price: cmd.price,
          category: cmd.category,
          location: cmd.location,
          city: cmd.city,
          country: cmd.country,
          status: "active" as const,
          mediaUrls: cmd.mediaUrls,
          createdAt: new Date().toISOString(),
        };

        await listingAdapter.save(listing);
        marketplaceEvents.listingPublished(listing);
        timer.done();
        return { ok: true as const, data: listing };
      } catch (err) {
        timer.fail(err);
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async pauseListing(listingId: string) {
      requireAuth(ctx);
      try {
        await listingAdapter.updateStatus(listingId, "paused");
        log.info("listing_paused", { listingId });
        return { ok: true as const, data: undefined };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async createBooking(cmd: CreateBookingCommand) {
      requireAuth(ctx);
      const timer = log.timed("create_booking", { listingId: cmd.listingId });

      try {
        const listing = await listingAdapter.findById(cmd.listingId);
        if (!listing) return { ok: false as const, error: "Listing not found" };

        const booking = {
          id: crypto.randomUUID(),
          listingId: cmd.listingId,
          buyerId: cmd.buyerId,
          sellerId: listing.ownerId,
          amount: listing.price,
          status: "pending" as const,
          checkIn: cmd.checkIn,
          checkOut: cmd.checkOut,
          createdAt: new Date().toISOString(),
        };

        await bookingAdapter.save(booking);
        marketplaceEvents.bookingCreated(booking);
        timer.done();
        return { ok: true as const, data: booking };
      } catch (err) {
        timer.fail(err);
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async confirmBooking(bookingId: string) {
      requireAuth(ctx);
      try {
        await bookingAdapter.updateStatus(bookingId, "confirmed");
        const booking = await bookingAdapter.findById(bookingId);
        if (booking) marketplaceEvents.bookingConfirmed(booking);
        log.info("booking_confirmed", { bookingId });
        return { ok: true as const, data: booking! };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async submitReview(cmd: SubmitReviewCommand) {
      requireAuth(ctx);
      rateLimit(`review:${cmd.reviewerId}`, 5);
      try {
        const review = {
          id: crypto.randomUUID(),
          bookingId: cmd.bookingId,
          reviewerId: cmd.reviewerId,
          targetId: "", // resolved from booking
          rating: cmd.rating,
          comment: sanitize(cmd.comment),
          createdAt: new Date().toISOString(),
        };
        marketplaceEvents.reviewSubmitted(review);
        log.info("review_submitted", { bookingId: cmd.bookingId });
        return { ok: true as const, data: review };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async searchListings(query: SearchQuery) {
      try {
        const results = await listingAdapter.search(query);
        return { ok: true as const, data: results };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}
