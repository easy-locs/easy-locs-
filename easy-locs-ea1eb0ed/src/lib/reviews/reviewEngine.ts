import { db } from "@/services/db";
import { checkThrottle, ThrottleError } from "@/lib/client-throttle";

export type ReviewVertical = "merchant" | "property" | "rider" | "service" | "experience";

const RATING_PRECISION = 1;

function normalizeRating(rating: number): number {
  const clamped = Math.max(0, Math.min(5, rating));
  return Number(clamped.toFixed(RATING_PRECISION));
}

function computeWeightedAverage(ratings: number[]): number {
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((s, r) => s + r, 0);
  return normalizeRating(sum / ratings.length);
}

function getEntityColumn(vertical: ReviewVertical): string {
  switch (vertical) {
    case "property": return "property_id";
    case "rider": return "rider_user_id";
    case "service": return "service_id";
    case "experience": return "experience_id";
    default: return "merchant_id";
  }
}

function getRatingTable(vertical: ReviewVertical): string {
  switch (vertical) {
    case "property": return "properties";
    case "rider": return "rider_presence";
    case "service": return "seed_services";
    case "experience": return "experiences";
    default: return "seed_merchants";
  }
}

export async function listReviews(entityId: string, vertical: ReviewVertical = "merchant") {
  const column = getEntityColumn(vertical);
  const { data, error } = await db
    .from("reviews")
    .select("*")
    .eq(column, entityId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return data ?? [];
}

export const listMerchantReviews = (merchantId: string) => listReviews(merchantId, "merchant");

export async function createReview(params: {
  entityId: string;
  vertical: ReviewVertical;
  reviewerUserId: string;
  rating: number;
  title?: string | null;
  comment?: string | null;
  orderId?: string | null;
  bookingId?: string | null;
}) {
  const throttle = checkThrottle("api:review");
  if (!throttle.allowed) {
    throw new ThrottleError("api:review", throttle.retryAfterMs);
  }

  const column = getEntityColumn(params.vertical);
  const rating = normalizeRating(params.rating);

  const { data, error } = await db
    .from("reviews")
    .insert({
      [column]: params.entityId,
      reviewer_user_id: params.reviewerUserId,
      rating,
      title: params.title ?? null,
      comment: params.comment ?? null,
      order_id: params.orderId ?? null,
      booking_id: params.bookingId ?? null,
      vertical: params.vertical,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .select("*")
    .single();

  if (error) throw error;

  void recomputeEntityRating(params.entityId, params.vertical).catch(() => {});

  return data;
}

export const createMerchantReview = (params: {
  merchantId: string;
  reviewerUserId: string;
  rating: number;
  title?: string | null;
  comment?: string | null;
  orderId?: string | null;
}) => createReview({
  entityId: params.merchantId,
  vertical: "merchant",
  reviewerUserId: params.reviewerUserId,
  rating: params.rating,
  title: params.title,
  comment: params.comment,
  orderId: params.orderId,
});

export async function replyToReview(params: {
  reviewId: string;
  merchantReply: string;
}) {
  const { data, error } = await db
    .from("reviews")
    .update({
      merchant_reply: params.merchantReply,
      replied_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.reviewId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listRiderReviews(riderUserId: string) {
  const { data, error } = await db
    .from("reviews")
    .select("*")
    .eq("merchant_id", riderUserId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return [];
  return data ?? [];
}

export async function recomputeEntityRating(entityId: string, vertical: ReviewVertical = "merchant") {
  const rows = await listReviews(entityId, vertical);
  const ratings = rows.map((r: { rating?: number | null }) => Number(r.rating ?? 0)).filter((r) => r > 0);
  const avg = computeWeightedAverage(ratings);
  const count = ratings.length;

  const table = getRatingTable(vertical);

  const { data, error } = await db
    .from(table)
    .update({
      rating: count > 0 ? avg : null,
      review_count: count,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entityId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export const recomputeMerchantRating = (merchantId: string) =>
  recomputeEntityRating(merchantId, "merchant");
