import { createMerchantReview, recomputeMerchantRating } from "@/lib/reviews/reviewEngine";
import { moderateReviewContent } from "@/lib/social/review-moderation";
import { emitReviewPosted } from "@/lib/social/engagement-events";
import { platformBus } from "@/lib/shared/platform-bus";

export type ReviewTargetType = "merchant" | "driver" | "property" | "service" | "listing";

export interface SubmitReviewParams {
  targetType: ReviewTargetType;
  targetId: string;
  targetName: string;
  reviewerUserId: string;
  rating: number;
  comment: string;
  orderId?: string;
}

export interface SubmitReviewResult {
  success: boolean;
  error?: string;
  reviewId?: string;
}

export async function submitReview(params: SubmitReviewParams): Promise<SubmitReviewResult> {
  const modResult = moderateReviewContent(params.comment);
  if (modResult.blocked) {
    return { success: false, error: modResult.reason ?? "Content flagged by moderation" };
  }

  if (params.rating < 1 || params.rating > 5) {
    return { success: false, error: "Rating must be between 1 and 5" };
  }

  try {
    const review = await createMerchantReview({
      merchantId: params.targetId,
      reviewerUserId: params.reviewerUserId,
      rating: params.rating,
      title: null,
      comment: modResult.cleanedText,
      orderId: params.orderId ?? null,
    });

    await recomputeMerchantRating(params.targetId).catch((e: Error) => {
      console.warn("[review-pipeline] Rating recompute failed:", e.message);
    });

    emitReviewPosted(params.reviewerUserId, params.targetName, params.rating);

    platformBus.emit("engagement:check_badges", { userId: params.reviewerUserId }, "review-pipeline");

    return { success: true, reviewId: review?.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.warn("[review-pipeline] Submit failed:", msg);
    return { success: false, error: "Failed to submit review. Please try again." };
  }
}
