import { platformBus } from "@/lib/shared/platform-bus";
import { trackEvent } from "@/lib/analytics/event-bus";
import { referralService } from "@/services/referral.service";

export function installReferralConversionHandler(): void {
  platformBus.on("order:completed", async (event) => {
    const p = event.payload as Record<string, unknown>;
    const userId = (p?.userId ?? p?.buyerUserId ?? p?.buyer_user_id) as string | undefined;
    const orderId = (p?.orderId ?? p?.bookingId) as string | undefined;

    if (!userId) return;

    try {
      const pending = await referralService.checkPendingConversion(userId);
      if (!pending) return;

      trackEvent({
        type: "referral.converted",
        userId,
        metadata: {
          orderId: orderId ?? null,
          referral_code: pending.code,
          referrer_user_id: pending.referrer_user_id,
          reward_amount: pending.reward_amount,
          reward_currency: pending.reward_currency,
        },
      });

      platformBus.emit("referral:converted", {
        userId,
        orderId: orderId ?? null,
        referrerUserId: pending.referrer_user_id,
        rewardAmount: pending.reward_amount,
        rewardCurrency: pending.reward_currency,
        referralCode: pending.code,
      }, "system");
    } catch (e) {
      if (import.meta.env.DEV) {
        console.warn("[referral-conversion] Failed to check/emit conversion:", e);
      }
    }
  });
}
