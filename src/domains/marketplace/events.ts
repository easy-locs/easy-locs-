/**
 * Marketplace Domain — Event adapter.
 */
import { publishDomainEvent, createDomainEvent } from "../shared/domain-event-bus";
import type { MarketplaceEventPort, Listing, Booking, Review } from "./ports";

export const marketplaceEvents: MarketplaceEventPort = {
  listingPublished(listing: Listing) {
    publishDomainEvent(
      createDomainEvent("marketplace:listing_published", listing.id, "listing", {
        ownerId: listing.ownerId, title: listing.title, category: listing.category,
        city: listing.city, country: listing.country,
      }, "marketplace")
    );
  },

  bookingCreated(booking: Booking) {
    publishDomainEvent(
      createDomainEvent("marketplace:booking_created", booking.id, "booking", {
        listingId: booking.listingId, buyerId: booking.buyerId,
        amount: booking.amount,
      }, "marketplace")
    );
  },

  bookingConfirmed(booking: Booking) {
    publishDomainEvent(
      createDomainEvent("marketplace:booking_confirmed", booking.id, "booking", {
        listingId: booking.listingId, sellerId: booking.sellerId,
      }, "marketplace")
    );
  },

  reviewSubmitted(review: Review) {
    publishDomainEvent(
      createDomainEvent("marketplace:review_submitted", review.id, "review", {
        bookingId: review.bookingId, rating: review.rating,
        targetId: review.targetId,
      }, "marketplace")
    );
  },
};
