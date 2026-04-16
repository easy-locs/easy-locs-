import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const TIER_THRESHOLDS: Record<string, number> = {
  bronze: 0,
  silver: 500,
  gold: 2000,
  platinum: 5000,
};

function computeTier(points: number): string {
  if (points >= 5000) return "platinum";
  if (points >= 2000) return "gold";
  if (points >= 500) return "silver";
  return "bronze";
}

Deno.serve(async (req: Request) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const auth = requireServiceRole(req);
  if (!auth.authorized) return auth.response!;

  try {
    const { userId, orderAmount, orderId } = await req.json();

    if (!userId || orderAmount === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing userId or orderAmount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pointsToAward = Math.max(1, Math.floor(Number(orderAmount)));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, serviceKey);

    if (orderId) {
      const { data: existingTx } = await db
        .from("loyalty_history")
        .select("id")
        .eq("order_id", orderId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingTx) {
        return new Response(
          JSON.stringify({ message: "Points already awarded for this order", duplicate: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { data: account, error: fetchErr } = await db
      .from("loyalty_accounts")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    let currentPoints = 0;
    let currentTier = "bronze";

    if (fetchErr && fetchErr.code !== "42P01") {
      console.error("[award-loyalty-points] Account fetch failed:", fetchErr.message);
    }

    if (account) {
      currentPoints = Number(account.points_balance ?? 0);
      currentTier = account.tier ?? "bronze";
    }

    const newPoints = currentPoints + pointsToAward;
    const newTier = computeTier(newPoints);
    const tierChanged = newTier !== currentTier;

    if (account) {
      const { error: updateErr } = await db
        .from("loyalty_accounts")
        .update({
          points_balance: newPoints,
          tier: newTier,
          updated_at: new Date().toISOString(),
        })
        .eq("id", account.id);

      if (updateErr) {
        console.error("[award-loyalty-points] Update failed:", updateErr.message);
        return new Response(
          JSON.stringify({ error: "Failed to update loyalty account" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      const { error: insertErr } = await db
        .from("loyalty_accounts")
        .insert({
          user_id: userId,
          points_balance: newPoints,
          tier: newTier,
          updated_at: new Date().toISOString(),
        });

      if (insertErr && insertErr.code !== "42P01") {
        console.error("[award-loyalty-points] Insert failed:", insertErr.message);
      }
    }

    await db
      .from("loyalty_history")
      .insert({
        user_id: userId,
        points: pointsToAward,
        action: "earn",
        reason: `Order completed (${orderAmount} spent)`,
        order_id: orderId ?? null,
        balance_after: newPoints,
        created_at: new Date().toISOString(),
      })
      .catch(() => {});

    if (tierChanged) {
      const emojiMap: Record<string, string> = { silver: "🥈", gold: "🥇", platinum: "💎" };
      await db.from("notifications").insert({
        id: crypto.randomUUID(),
        user_id: userId,
        type: "engagement",
        title: `${emojiMap[newTier] ?? "🏆"} Tier Upgrade!`,
        body: `Congratulations! You've reached ${newTier} tier`,
        read: false,
        metadata_json: { route: "/me/loyalty" },
      }).catch(() => {});
    }

    return new Response(
      JSON.stringify({
        points_awarded: pointsToAward,
        new_balance: newPoints,
        old_tier: currentTier,
        new_tier: newTier,
        tier_changed: tierChanged,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[award-loyalty-points] Error:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
