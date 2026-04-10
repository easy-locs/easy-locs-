import { db } from "@/services/db";

export async function listMerchantReviews(merchantId: string) {
  const { data, error } = await db
    .from("reviews")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return data ?? [];
}

export async function createMerchantReview(params: {
  merchantId: string;
  reviewerUserId: string;
  rating: number;
  title?: string | null;
  comment?: string | null;
  orderId?: string | null;
}) {
  const { data, error } = await db
    .from("reviews")
    .insert({
      merchant_id: params.merchantId,
      reviewer_user_id: params.reviewerUserId,
      rating: params.rating,
      title: params.title ?? null,
      comment: params.comment ?? null,
      order_id: params.orderId ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

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

export async function recomputeMerchantRating(merchantId: string) {
  const rows = await listMerchantReviews(merchantId);
  const count = rows.length;
  const avg =
    count > 0
      ? rows.reduce((sum: number, r: any) => sum + Number(r.rating ?? 0), 0) / count
      : 0;

  const { data, error } = await db
    .from("seed_merchants")
    .update({
      rating: count > 0 ? Number(avg.toFixed(2)) : null,
      review_count: count,
      updated_at: new Date().toISOString(),
    })
    .eq("id", merchantId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
