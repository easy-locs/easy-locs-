import { c2cRepo, type C2CListingRow, type C2COfferRow } from "@/repositories/domain/c2c.repo";
import { db } from "@/services/db";
import { platformBus } from "@/lib/shared/platform-bus";
import { autoModerateOnPublish, checkUserBlocklist, type ModerationResult } from "@/lib/c2c/c2c-moderation";
import { createDealWithEvent, findExistingDealRoom } from "@/repositories/deals.repository";
import { createConversation } from "@/repositories/communication.repository";

export const c2cService = {
  async listListings(opts: Parameters<typeof c2cRepo.listWithCursor>[0]) {
    return c2cRepo.listWithCursor(opts);
  },

  async searchListings(query: string, opts?: { category?: string; limit?: number }) {
    return c2cRepo.fullTextSearch(query, opts);
  },

  async getListingDetail(id: string) {
    return c2cRepo.getDetail(id);
  },

  async createListing(listing: Partial<C2CListingRow>) {
    const created = await c2cRepo.create(listing);

    autoModerateOnPublish(
      created.id,
      created.title || "",
      created.description || "",
      created.price || 0,
      created.category || "",
    ).catch(() => {});

    const { notifySavedSearchMatches } = await import("@/lib/c2c/listing-lifecycle");
    notifySavedSearchMatches({
      id: created.id,
      title: created.title,
      category: created.category,
      price: created.price,
      city: created.city,
      condition: created.condition,
    }).catch(() => {});

    return created;
  },

  async checkBlocklist(userId: string, sellerId: string): Promise<boolean> {
    return checkUserBlocklist(userId, sellerId);
  },

  async updateListing(id: string, patch: Partial<C2CListingRow>) {
    return c2cRepo.update(id, patch);
  },

  async markAsSold(listingId: string) {
    await c2cRepo.markSold(listingId);
  },

  async getSimilarListings(listing: { subcategory?: string; category: string; price: number; id: string }) {
    return c2cRepo.getSimilarListings(listing);
  },

  async getPriceIntelligence(subcategory: string, price: number) {
    const stats = await c2cRepo.getPriceStats(subcategory);
    if (!stats || stats.count < 3) return null;

    const ratio = price / stats.avg;
    let indicator: "good_deal" | "fair_price" | "above_market";
    if (ratio <= 0.8) indicator = "good_deal";
    else if (ratio <= 1.15) indicator = "fair_price";
    else indicator = "above_market";

    return { indicator, avgPrice: stats.avg, medianPrice: stats.median, count: stats.count };
  },

  async getSellerStats(userId: string) {
    return c2cRepo.getSellerStats(userId);
  },

  async createOffer(offer: Parameters<typeof c2cRepo.createOffer>[0]) {
    const created = await c2cRepo.createOffer(offer);

    const contextId = `c2c_listing_${offer.listing_id}`;
    const existingDeal = await findExistingDealRoom("c2c_listing", contextId, offer.buyer_id).catch(() => null);

    let dealId = existingDeal?.id;
    let conversationId = created.conversation_id;

    if (!existingDeal) {
      try {
        const conversation = await createConversation({
          type: "c2c_exchange",
          title: `C2C Offer — Listing ${offer.listing_id}`,
          participants: [
            { user_id: offer.buyer_id, role: "buyer" },
            { user_id: offer.seller_id, role: "seller" },
          ],
        });
        conversationId = conversation?.id || null;

        const deal = await createDealWithEvent({
          orgId: offer.seller_id,
          buyerId: offer.buyer_id,
          contextType: "c2c_listing",
          contextId,
          contextTitle: `C2C Listing ${offer.listing_id}`,
          threadId: conversationId || undefined,
        });
        dealId = deal?.id;

        if (conversationId || dealId) {
          await c2cRepo.updateOffer(created.id, {
            ...(conversationId ? { conversation_id: conversationId } : {}),
            ...(dealId ? { deal_id: dealId } : {}),
          } as Partial<C2COfferRow>).catch(() => {});
        }
      } catch {
        /* DealRoom/Orbit integration is best-effort; offer still valid */
      }
    }

    platformBus.emit("c2c:offer_received", {
      type: "c2c:offer_received",
      payload: {
        sellerId: offer.seller_id,
        buyerId: offer.buyer_id,
        listingId: offer.listing_id,
        offerId: created.id,
        amount: offer.amount,
        currency: offer.currency,
        dealId,
        conversationId,
      },
    });

    return created;
  },

  async acceptOffer(offerId: string, sellerId: string) {
    const updated = await c2cRepo.updateOffer(offerId, { status: "accepted" });

    if (updated.deal_id) {
      const { updateDealRoom, insertDealEvent } = await import("@/repositories/deals.repository");
      await updateDealRoom(updated.deal_id, {
        status: "accepted",
        current_offer_amount: updated.counter_amount || updated.amount,
      }).catch(() => {});
      await insertDealEvent({
        deal_id: updated.deal_id,
        event_type: "status_change",
        actor_id: sellerId,
        actor_role: "seller",
        data_json: { new_status: "accepted", offer_amount: updated.counter_amount || updated.amount },
      }).catch(() => {});
    }

    platformBus.emit("c2c:offer_accepted", {
      type: "c2c:offer_accepted",
      payload: {
        buyerId: updated.buyer_id,
        sellerId,
        listingId: updated.listing_id,
        offerId,
        amount: updated.counter_amount || updated.amount,
        dealId: updated.deal_id,
      },
    });

    return updated;
  },

  async declineOffer(offerId: string) {
    const updated = await c2cRepo.updateOffer(offerId, { status: "declined" });

    if (updated) {
      platformBus.emit("c2c:offer_declined", {
        type: "c2c:offer_declined",
        payload: {
          offerId,
          buyerId: updated.buyer_id,
          sellerId: updated.seller_id,
          listingId: updated.listing_id,
          amount: updated.amount,
        },
      });
    }

    return updated;
  },

  async counterOffer(offerId: string, counterAmount: number, counterMessage?: string) {
    const updated = await c2cRepo.updateOffer(offerId, {
      status: "countered",
      counter_amount: counterAmount,
      counter_message: counterMessage || null,
    });

    platformBus.emit("c2c:offer_countered", {
      type: "c2c:offer_countered",
      payload: {
        buyerId: updated.buyer_id,
        sellerId: updated.seller_id,
        listingId: updated.listing_id,
        offerId,
        counterAmount,
      },
    });

    return updated;
  },

  async getOffersForListing(listingId: string) {
    return c2cRepo.getOffersForListing(listingId);
  },

  async getOffersForSeller(sellerId: string) {
    return c2cRepo.getOffersForSeller(sellerId);
  },

  async reportListing(report: Parameters<typeof c2cRepo.createReport>[0]) {
    await c2cRepo.createReport(report);

    const listing = await c2cRepo.getDetail(report.listing_id).catch(() => ({ data: null }));

    platformBus.emit("c2c:listing_reported", {
      type: "c2c:listing_reported",
      payload: {
        listingId: report.listing_id,
        reason: report.reason,
        sellerId: listing.data?.user_id,
        listingTitle: listing.data?.title,
      },
    });
  },

  async leaveReview(review: Parameters<typeof c2cRepo.createReview>[0]) {
    await c2cRepo.createReview(review);
  },

  async getMyListings(userId: string, status?: string) {
    return c2cRepo.getMyListings(userId, status);
  },

  async getSellerReviews(sellerId: string) {
    return c2cRepo.getSellerReviews(sellerId);
  },

  async incrementViews(id: string, current: number) {
    return c2cRepo.incrementViewCount(id, current);
  },

  emitNewMessage(params: {
    sellerId: string;
    listingId: string;
    listingTitle: string;
    buyerName: string;
    conversationId: string;
  }) {
    platformBus.emit("c2c:new_message", {
      type: "c2c:new_message",
      payload: params,
    });
  },

  async validateC2CPaymentRequest(
    listingId: string,
    offerId: string,
    sellerId: string,
    amount: number,
    currency: string,
    buyerId: string,
  ): Promise<{ valid: true } | { valid: false; reason: string }> {
    if (!listingId || !offerId || !sellerId || !buyerId) {
      return { valid: false, reason: "Missing required payment parameters" };
    }

    const offer = await c2cRepo.getOffer(offerId).catch(() => null);
    if (!offer) return { valid: false, reason: "Offer not found" };
    if (offer.listing_id !== listingId) return { valid: false, reason: "Offer does not match listing" };
    if (offer.status !== "accepted") return { valid: false, reason: `Offer is not accepted (status: ${offer.status})` };
    if (offer.buyer_id !== buyerId) return { valid: false, reason: "Buyer mismatch" };
    if (offer.seller_id !== sellerId) return { valid: false, reason: "Seller mismatch" };
    const effectiveAmount = offer.counter_amount ?? offer.amount;
    if (Math.abs(effectiveAmount - amount) > 0.01) return { valid: false, reason: "Amount mismatch" };

    const listing = await c2cRepo.getDetail(listingId).catch(() => ({ data: null }));
    if (!listing.data) return { valid: false, reason: "Listing not found" };
    if (listing.data.status === "sold") return { valid: false, reason: "Listing already sold" };
    if (listing.data.user_id !== sellerId) return { valid: false, reason: "Listing seller mismatch" };

    return { valid: true };
  },

  async confirmPaymentAndMarkSold(listingId: string, offerId: string, transactionId: string) {
    if (!transactionId || !listingId || !offerId) {
      throw new Error("Missing required parameters for payment confirmation");
    }

    const offer = await c2cRepo.getOffer(offerId);
    if (!offer) throw new Error("Offer not found");
    if (offer.listing_id !== listingId) throw new Error("Offer/listing mismatch");
    if (offer.status !== "accepted") throw new Error(`Invalid offer status for confirmation: ${offer.status}`);

    const listing = await c2cRepo.getDetail(listingId).catch(() => ({ data: null }));
    if (!listing.data) throw new Error("Listing not found");
    if (listing.data.status === "sold") throw new Error("Listing already sold");

    const { data: txRecord } = await db
      .from("wallet_transactions")
      .select("id, amount, currency, sender_id, recipient_id, status, context_id")
      .eq("id", transactionId)
      .maybeSingle();

    if (!txRecord) throw new Error("Transaction not found");
    if (txRecord.status !== "completed") throw new Error(`Transaction not completed: ${txRecord.status}`);
    if (txRecord.recipient_id !== listing.data.user_id && txRecord.recipient_id !== offer.seller_id) {
      throw new Error("Transaction recipient does not match seller");
    }
    if (txRecord.sender_id !== offer.buyer_id) {
      throw new Error("Transaction sender does not match buyer");
    }

    const expectedAmount = offer.counter_amount ?? offer.amount;
    const expectedCurrency = offer.currency || listing.data.currency || "EUR";
    if (Math.abs(Number(txRecord.amount) - expectedAmount) > 0.01) {
      throw new Error(`Transaction amount mismatch: expected ${expectedAmount}, got ${txRecord.amount}`);
    }
    if (txRecord.currency && txRecord.currency.toUpperCase() !== expectedCurrency.toUpperCase()) {
      throw new Error(`Transaction currency mismatch: expected ${expectedCurrency}, got ${txRecord.currency}`);
    }

    const expectedContextId = `c2c_${listingId}_${offerId}`;
    if (txRecord.context_id && txRecord.context_id !== expectedContextId && txRecord.context_id !== listingId && txRecord.context_id !== offerId) {
      throw new Error("Transaction context does not match listing/offer");
    }

    await c2cRepo.markSold(listingId);

    if (offer.deal_id) {
      const { updateDealRoom, insertDealEvent } = await import("@/repositories/deals.repository");
      await updateDealRoom(offer.deal_id, { status: "confirmed" }).catch(() => {});
      await insertDealEvent({
        deal_id: offer.deal_id,
        event_type: "payment_confirmed",
        actor_id: "system",
        actor_role: "system",
        data_json: { transactionId, transactionType: "c2c_purchase", listingId },
      }).catch(() => {});
    }

    await c2cRepo.updateOffer(offerId, { status: "confirmed" }).catch(() => {});

    platformBus.emit("c2c:listing_sold", {
      type: "c2c:listing_sold",
      payload: {
        listingId,
        offerId,
        transactionId,
        sellerId: listing.data.user_id || offer.seller_id,
        listingTitle: listing.data.title,
        amount: offer.counter_amount ?? offer.amount,
        currency: listing.data.currency || "EUR",
      },
    });
  },
};
