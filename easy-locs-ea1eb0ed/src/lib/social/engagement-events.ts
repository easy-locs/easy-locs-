import { platformBus } from "@/lib/shared/platform-bus";
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

export function emitTierUpgrade(userId: string, newTier: string, tierEmoji: string) {
  platformBus.emit("engagement:tier_upgrade", {
    userId,
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

export function installEngagementListeners() {
  const checkBadges = async (userId: string) => {
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
  };

  platformBus.on("engagement:check_badges", (event) => {
    const userId = event?.payload?.userId;
    if (userId) void checkBadges(userId);
  });

  platformBus.on("wallet:payment_success", (event) => {
    const userId = event?.payload?.userId;
    if (userId) {
      platformBus.emit("engagement:check_badges", { userId }, "engagement-wiring");
    }
  });

  platformBus.on("commerce:order_completed", (event) => {
    const userId = event?.payload?.userId;
    if (userId) {
      platformBus.emit("engagement:check_badges", { userId }, "engagement-wiring");
    }
  });
}
