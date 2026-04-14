import { db } from "@/services/db";
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
  const clientMod = moderateReviewContent(params.comment);
  if (clientMod.blocked) {
    return { success: false, error: clientMod.reason ?? "Content flagged by moderation" };
  }

  if (params.rating < 1 || params.rating > 5) {
    return { success: false, error: "Rating must be between 1 and 5" };
  }

  try {
    const { data, error } = await db.functions.invoke("submit-review", {
      body: {
        targetType: params.targetType,
        targetId: params.targetId,
        rating: params.rating,
        comment: clientMod.cleanedText,
        orderId: params.orderId ?? null,
      },
    });

    if (error) {
      console.warn("[review-pipeline] Edge function error:", error.message);
      return { success: false, error: "Failed to submit review. Please try again." };
    }

    if (data?.error) {
      return { success: false, error: data.error };
    }

    emitReviewPosted(params.reviewerUserId, params.targetName, params.rating);
    platformBus.emit("engagement:check_badges", { userId: params.reviewerUserId }, "review-pipeline");

    return { success: true, reviewId: data?.reviewId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.warn("[review-pipeline] Submit failed:", msg);
    return { success: false, error: "Failed to submit review. Please try again." };
  }
}
