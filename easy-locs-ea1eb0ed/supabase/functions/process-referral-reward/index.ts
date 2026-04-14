import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireServiceRole } from "../_shared/edge-auth.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const auth = requireServiceRole(req);
  if (!auth.authorized) return auth.response!;

  try {
    const { userId, orderId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, serviceKey);

    const { data: pendingReferrals, error: refErr } = await db
      .from("referral_redemptions")
      .select("id, referrer_user_id, referred_user_id, reward_amount, reward_currency, status")
      .eq("referred_user_id", userId)
      .eq("status", "pending");

    if (refErr) {
      console.error("[process-referral-reward] Query failed:", refErr.message);
      return new Response(
        JSON.stringify({ error: "Failed to query referrals" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pendingReferrals || pendingReferrals.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: "No pending referrals" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: priorOrders } = await db
      .from("bookings_v2")
      .select("id")
      .eq("buyer_user_id", userId)
      .eq("status", "completed")
      .limit(2);

    const isFirstOrder = !priorOrders || priorOrders.length <= 1;

    if (!isFirstOrder) {
      return new Response(
        JSON.stringify({ processed: 0, message: "Not first completed order — referral rewards only apply to first order" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processed = 0;
    const results: Array<{ id: string; status: string }> = [];

    for (const ref of pendingReferrals) {
      const baseKey = `referral_${ref.id}`;

      const [{ data: existingReferrer }, { data: existingReferee }] = await Promise.all([
        db.from("wallet_transactions").select("id").eq("idempotency_key", `${baseKey}_referrer`).maybeSingle(),
        db.from("wallet_transactions").select("id").eq("idempotency_key", `${baseKey}_referee`).maybeSingle(),
      ]);

      const referrerDone = !!existingReferrer;
      const refereeDone = !!existingReferee;

      if (referrerDone && refereeDone) {
        await db.from("referral_redemptions").update({ status: "credited" }).eq("id", ref.id).eq("status", "pending");
        results.push({ id: ref.id, status: "already_processed" });
        continue;
      }

      let referrerOk = referrerDone;
      let refereeOk = refereeDone;

      if (!referrerDone) {
        const creditReferrer = await db.from("wallet_transactions").insert({
          user_id: ref.referrer_user_id,
          amount: ref.reward_amount,
          direction: "credit",
          category: "referral_bonus",
          description: `Referral bonus — friend completed first order`,
          idempotency_key: `${baseKey}_referrer`,
          created_at: new Date().toISOString(),
        });
        referrerOk = !creditReferrer.error;
        if (creditReferrer.error) {
          console.warn("[process-referral-reward] Referrer credit failed:", creditReferrer.error.message);
        }
      }

      if (!refereeDone) {
        const creditReferee = await db.from("wallet_transactions").insert({
          user_id: ref.referred_user_id,
          amount: ref.reward_amount,
          direction: "credit",
          category: "referral_welcome_bonus",
          description: `Welcome bonus — referred by a friend`,
          idempotency_key: `${baseKey}_referee`,
          created_at: new Date().toISOString(),
        });
        refereeOk = !creditReferee.error;
        if (creditReferee.error) {
          console.warn("[process-referral-reward] Referee credit failed:", creditReferee.error.message);
        }
      }

      if (referrerOk && refereeOk) {
        const { error: updateErr } = await db
          .from("referral_redemptions")
          .update({ status: "credited" })
          .eq("id", ref.id)
          .eq("status", "pending");

        if (updateErr) {
          console.warn("[process-referral-reward] Status update failed:", updateErr.message);
          results.push({ id: ref.id, status: "credit_done_status_update_failed" });
        } else {
          await db.from("notifications").insert([
            {
              id: crypto.randomUUID(),
              user_id: ref.referrer_user_id,
              type: "engagement",
              title: "🎉 Referral Bonus!",
              body: `You earned ${ref.reward_amount} ${ref.reward_currency} from a referral`,
              read: false,
              metadata_json: { route: "/me/referrals" },
            },
            {
              id: crypto.randomUUID(),
              user_id: ref.referred_user_id,
              type: "engagement",
              title: "🎉 Welcome Bonus!",
              body: `You earned ${ref.reward_amount} ${ref.reward_currency} as a welcome bonus`,
              read: false,
              metadata_json: { route: "/me/referrals" },
            },
          ]).catch(() => {});

          results.push({ id: ref.id, status: "credited" });
          processed++;
        }
      } else {
        results.push({
          id: ref.id,
          status: `partial_${referrerOk ? "referrer_ok" : "referrer_failed"}_${refereeOk ? "referee_ok" : "referee_failed"}`,
        });
      }
    }

    return new Response(
      JSON.stringify({ processed, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[process-referral-reward] Error:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
