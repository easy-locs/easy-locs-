import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireAuthenticatedUser } from "../_shared/edge-auth.ts";

const SPAM_KEYWORDS = ["buy now", "click here", "free money", "casino", "viagra", "http://"];
const INSULT_KEYWORDS = ["idiot", "stupid", "moron", "trash", "garbage", "scam", "fraud"];

function moderateContent(text: string): { blocked: boolean; reason?: string; cleaned: string } {
  const lower = text.toLowerCase();
  for (const kw of SPAM_KEYWORDS) {
    if (lower.includes(kw)) return { blocked: true, reason: "Content flagged as spam", cleaned: text };
  }
  let cleaned = text;
  for (const kw of INSULT_KEYWORDS) {
    const regex = new RegExp(kw, "gi");
    if (regex.test(cleaned)) {
      cleaned = cleaned.replace(regex, "***");
    }
  }
  return { blocked: false, cleaned };
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const auth = await requireAuthenticatedUser(req);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await req.json();
    const { targetType, targetId, rating, comment, orderId } = body;

    if (!targetType || !targetId || !rating) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: targetType, targetId, rating" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (rating < 1 || rating > 5) {
      return new Response(
        JSON.stringify({ error: "Rating must be between 1 and 5" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validTargets = ["merchant", "driver", "property", "service", "listing"];
    if (!validTargets.includes(targetType)) {
      return new Response(
        JSON.stringify({ error: "Invalid target type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const modResult = moderateContent(comment ?? "");
    if (modResult.blocked) {
      return new Response(
        JSON.stringify({ error: modResult.reason }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, serviceKey);

    const { data: review, error: insertErr } = await db
      .from("reviews")
      .insert({
        merchant_id: targetId,
        target_type: targetType,
        reviewer_user_id: auth.userId,
        rating,
        title: null,
        comment: modResult.cleaned,
        order_id: orderId ?? null,
        moderation_status: "approved",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("[submit-review] Insert failed:", insertErr.message);
      return new Response(
        JSON.stringify({ error: "Failed to save review" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetTableMap: Record<string, string> = {
      merchant: "seed_merchants",
      driver: "drivers",
      property: "properties",
      service: "services",
      listing: "listings",
    };
    const targetTable = targetTableMap[targetType] ?? "seed_merchants";

    const { data: allReviews } = await db
      .from("reviews")
      .select("rating")
      .eq("merchant_id", targetId);

    if (allReviews && allReviews.length > 0) {
      const avg = allReviews.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / allReviews.length;
      await db
        .from(targetTable)
        .update({
          rating: Number(avg.toFixed(2)),
          review_count: allReviews.length,
          updated_at: new Date().toISOString(),
        })
        .eq("id", targetId);
    }

    const { data: targetEntity } = await db
      .from(targetTable)
      .select("user_id")
      .eq("id", targetId)
      .maybeSingle();

    if (targetEntity?.user_id) {
      await db.from("notifications").insert({
        id: crypto.randomUUID(),
        user_id: targetEntity.user_id,
        type: "review",
        title: `⭐ New ${rating}-star review`,
        body: modResult.cleaned ? modResult.cleaned.substring(0, 100) : "You received a new review",
        read: false,
        metadata_json: { route: `/pro/reviews`, reviewId: review.id, targetId },
      }).catch(() => {});
    }

    return new Response(
      JSON.stringify({ success: true, reviewId: review.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[submit-review] Error:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
