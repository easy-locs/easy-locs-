import { createMerchantReview, recomputeMerchantRating } from "@/lib/reviews/reviewEngine";
import { moderateReviewContent } from "@/lib/social/review-moderation";
import { emitReviewPosted } from "@/lib/social/engagement-events";
import { platformBus } from "@/lib/shared/platform-bus";
import { db } from "@/services/db";

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

async function insertGenericReview(params: SubmitReviewParams, cleanedComment: string): Promise<string | undefined> {
  const { data, error } = await db("reviews")
    .insert({
      merchant_id: params.targetId,
      target_type: params.targetType,
      reviewer_user_id: params.reviewerUserId,
      rating: params.rating,
      title: null,
      comment: cleanedComment,
      order_id: params.orderId ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) throw error;
  return data?.id;
}

async function recomputeTargetRating(targetType: ReviewTargetType, targetId: string): Promise<void> {
  if (targetType === "merchant") {
    await recomputeMerchantRating(targetId);
    return;
  }

  const tableMap: Record<string, string> = {
    driver: "drivers",
    property: "properties",
    service: "services",
    listing: "listings",
  };

  const table = tableMap[targetType];
  if (!table) return;

  const { data: rows, error: fetchErr } = await db("reviews")
    .select("rating")
    .eq("merchant_id", targetId)
    .eq("target_type", targetType);

  if (fetchErr || !rows || rows.length === 0) return;

  const avg = rows.reduce((s: number, r: { rating: number }) => s + Number(r.rating), 0) / rows.length;

  const { error: updateErr } = await db(table)
    .update({
      rating: Number(avg.toFixed(2)),
      review_count: rows.length,
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetId);

  if (updateErr && updateErr.code !== "42P01") {
    console.warn(`[review-pipeline] Rating update failed for ${table}:`, updateErr.message);
  }
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
    let reviewId: string | undefined;

    if (params.targetType === "merchant") {
      const review = await createMerchantReview({
        merchantId: params.targetId,
        reviewerUserId: params.reviewerUserId,
        rating: params.rating,
        comment: modResult.cleanedText,
        orderId: params.orderId ?? null,
      });
      reviewId = review?.id;
    } else {
      reviewId = await insertGenericReview(params, modResult.cleanedText);
    }

    await recomputeTargetRating(params.targetType, params.targetId).catch((e: Error) => {
      console.warn("[review-pipeline] Rating recompute failed:", e.message);
    });

    emitReviewPosted(params.reviewerUserId, params.targetName, params.rating);
    platformBus.emit("engagement:check_badges", { userId: params.reviewerUserId }, "review-pipeline");

    return { success: true, reviewId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.warn("[review-pipeline] Submit failed:", msg);
    return { success: false, error: "Failed to submit review. Please try again." };
  }
}
