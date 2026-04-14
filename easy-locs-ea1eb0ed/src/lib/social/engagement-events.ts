import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";
import { dispatchNotification } from "@/lib/notifications/notification-writer";

export function emitBadgeUnlocked(userId: string, badgeName: string, badgeEmoji: string) {
  platformBus.emit("engagement:badge_unlocked", {
    userId,
    badgeName,
    badgeEmoji,
    at: new Date().toISOString(),
  }, "badge-system");

  dispatchNotification({
    userId,
    title: `${badgeEmoji} Badge Unlocked!`,
    body: `You earned the "${badgeName}" badge`,
    category: "engagement",
    route: "/me/badges",
  }).catch(() => {});
}

export function emitTierUpgrade(userId: string, oldTier: string, newTier: string, tierEmoji: string) {
  platformBus.emit("engagement:tier_upgrade", {
    userId,
    oldTier,
    newTier,
    tierEmoji,
    at: new Date().toISOString(),
  }, "loyalty-system");

  dispatchNotification({
    userId,
    title: `${tierEmoji} Tier Upgrade!`,
    body: `Congratulations! You've reached ${newTier} tier`,
    category: "engagement",
    route: "/me/loyalty",
  }).catch(() => {});
}

export function emitReferralBonus(userId: string, amount: number, currency: string) {
  platformBus.emit("engagement:referral_bonus", {
    userId,
    amount,
    currency,
    at: new Date().toISOString(),
  }, "referral-system");

  dispatchNotification({
    userId,
    title: "🎉 Referral Bonus!",
    body: `You earned ${amount} ${currency} from a referral`,
    category: "engagement",
    route: "/me/referrals",
  }).catch(() => {});
}

export function emitReviewPosted(userId: string, targetName: string, rating: number) {
  platformBus.emit("engagement:review_posted", {
    userId,
    targetName,
    rating,
    at: new Date().toISOString(),
  }, "review-system");
}

async function handleOrderCompleted(userId: string) {
  try {
    const { awardLoyaltyPoints, getLoyaltyTier, getOrCreateLoyaltyAccount } = await import("@/lib/loyalty/loyaltyEngine");
    const before = await getOrCreateLoyaltyAccount(userId);
    const oldTier = before.tier ?? "bronze";
    const oldPoints = Number(before.points_balance ?? 0);
    const pointsToAward = 10;
    await awardLoyaltyPoints({ userId, points: pointsToAward });
    const newTier = getLoyaltyTier(oldPoints + pointsToAward);
    if (newTier !== oldTier) {
      const emojiMap: Record<string, string> = { silver: "🥈", gold: "🥇", platinum: "💎" };
      emitTierUpgrade(userId, oldTier, newTier, emojiMap[newTier] ?? "🏆");
    }
  } catch (e) {
    console.warn("[engagement] Loyalty accrual failed:", e);
  }

  try {
    const { db } = await import("@/services/db");
    const { data: pendingReferrals } = await db("referral_redemptions")
      .select("id, referrer_user_id, reward_amount, reward_currency")
      .eq("referred_user_id", userId)
      .eq("status", "pending");

    if (pendingReferrals && pendingReferrals.length > 0) {
      const { applyWalletCredit } = await import("@/lib/wallet/apply-wallet-credit");
      for (const ref of pendingReferrals) {
        await applyWalletCredit({
          userId: ref.referrer_user_id,
          amount: ref.reward_amount,
          direction: "credit",
          reason: `Referral bonus — friend completed first order`,
        }).catch(() => {});

        await db("referral_redemptions")
          .update({ status: "credited" })
          .eq("id", ref.id)
          .catch(() => {});

        emitReferralBonus(ref.referrer_user_id, ref.reward_amount, ref.reward_currency);
      }
    }
  } catch (e) {
    console.warn("[engagement] Referral credit failed:", e);
  }
}

async function handleBadgeCheck(userId: string) {
  try {
    const { collectUserStats, syncUserBadges, fetchUserBadges, BADGE_DEFINITIONS } = await import("@/lib/social/badge-system");
    const existingBefore = await fetchUserBadges(userId);
    const beforeIds = new Set(existingBefore.map((b) => b.badge_id));
    const stats = await collectUserStats(userId);
    const updated = await syncUserBadges(userId, stats);
    const newlyUnlocked = updated.filter((b) => !beforeIds.has(b.badge_id));
    for (const badge of newlyUnlocked) {
      const def = BADGE_DEFINITIONS.find((d) => d.id === badge.badge_id);
      if (def) emitBadgeUnlocked(userId, def.name, def.emoji);
    }
  } catch (e) {
    console.warn("[engagement] Badge check failed:", e);
  }
}

async function handleReviewPosted(userId: string, merchantId?: string) {
  if (merchantId) {
    try {
      const { recomputeMerchantRating } = await import("@/lib/reviews/reviewEngine");
      await recomputeMerchantRating(merchantId);
    } catch (e) {
      console.warn("[engagement] Rating recompute failed:", e);
    }
  }

  platformBus.emit("engagement:check_badges", { userId }, "review-wiring");
}

export function installEngagementListeners() {
  platformBus.on("engagement:check_badges", (event) => {
    const userId = event?.payload?.userId;
    if (userId) void handleBadgeCheck(userId);
  });

  platformBus.on(APP_EVENTS.ORDER_COMPLETED, (event) => {
    const userId = event?.payload?.userId ?? event?.payload?.user_id;
    if (userId) {
      void handleOrderCompleted(userId);
      platformBus.emit("engagement:check_badges", { userId }, "engagement-wiring");
    }
  });

  platformBus.on(APP_EVENTS.WALLET_PAYMENT_SUCCESS, (event) => {
    const userId = event?.payload?.userId ?? event?.payload?.user_id;
    if (userId) {
      platformBus.emit("engagement:check_badges", { userId }, "engagement-wiring");
    }
  });

  platformBus.on(APP_EVENTS.PAYMENT_SUCCESS, (event) => {
    const userId = event?.payload?.userId ?? event?.payload?.user_id;
    if (userId) {
      platformBus.emit("engagement:check_badges", { userId }, "engagement-wiring");
    }
  });

  platformBus.on("engagement:review_posted", (event) => {
    const userId = event?.payload?.userId;
    const merchantId = event?.payload?.merchantId;
    if (userId) void handleReviewPosted(userId, merchantId);
  });

  if (import.meta.env.DEV) console.log("[engagement] Listeners installed — order/payment/review/badge flows active");
}
