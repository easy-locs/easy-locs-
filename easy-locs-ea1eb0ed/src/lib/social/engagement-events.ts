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

async function handleOrderCompletedNotifications(userId: string) {
  try {
    const { getOrCreateLoyaltyAccount } = await import("@/lib/loyalty/loyaltyEngine");
    const account = await getOrCreateLoyaltyAccount(userId);
    const tier = account?.tier ?? "bronze";
    if (tier !== "bronze") {
      if (import.meta.env.DEV) console.log("[engagement] User tier after order:", tier);
    }
  } catch {
    // tier check is non-critical
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

export function installEngagementListeners() {
  platformBus.on("engagement:check_badges", (event) => {
    const userId = event?.payload?.userId;
    if (userId) void handleBadgeCheck(userId);
  });

  platformBus.on(APP_EVENTS.ORDER_COMPLETED, (event) => {
    const userId = event?.payload?.userId ?? event?.payload?.user_id;
    if (userId) {
      void handleOrderCompletedNotifications(userId);
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
    if (userId) {
      platformBus.emit("engagement:check_badges", { userId }, "review-wiring");
    }
  });

  if (import.meta.env.DEV) console.log("[engagement] Listeners installed — server-authoritative order/payment/review/badge flows active");
}
