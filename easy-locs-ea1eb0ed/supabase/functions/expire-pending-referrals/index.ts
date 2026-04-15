import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireServiceRole } from "../_shared/edge-auth.ts";

const DEFAULT_EXPIRY_DAYS = 90;
const MIN_EXPIRY_DAYS = 1;
const MAX_EXPIRY_DAYS = 365;

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const auth = requireServiceRole(req);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await req.json().catch(() => ({}));
    const rawDays = body.expiryDays ?? DEFAULT_EXPIRY_DAYS;
    const expiryDays = Number(rawDays);

    if (!Number.isFinite(expiryDays) || !Number.isInteger(expiryDays) || expiryDays < MIN_EXPIRY_DAYS || expiryDays > MAX_EXPIRY_DAYS) {
      return new Response(
        JSON.stringify({ error: `expiryDays must be an integer between ${MIN_EXPIRY_DAYS} and ${MAX_EXPIRY_DAYS}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, serviceKey);

    const cutoffDate = new Date(Date.now() - expiryDays * 86400000).toISOString();

    const { data: staleRedemptions, error: queryErr } = await db
      .from("referral_redemptions")
      .select("id, code, status, created_at")
      .eq("status", "pending")
      .lt("created_at", cutoffDate);

    if (queryErr) {
      console.error("[expire-pending-referrals] Query failed:", queryErr.message);
      return new Response(
        JSON.stringify({ error: "Failed to query pending redemptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!staleRedemptions || staleRedemptions.length === 0) {
      return new Response(
        JSON.stringify({ expired: 0, decremented: 0, message: "No stale pending redemptions found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ids = staleRedemptions.map((r: { id: string }) => r.id);
    const { data: updatedRows, error: updateErr } = await db
      .from("referral_redemptions")
      .update({ status: "expired" })
      .in("id", ids)
      .eq("status", "pending")
      .select("id, code");

    if (updateErr) {
      console.error("[expire-pending-referrals] Status update failed:", updateErr.message);
      return new Response(
        JSON.stringify({ error: "Failed to expire redemptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const actuallyExpired: Array<{ id: string; code: string }> = updatedRows ?? [];

    const codeCountMap: Record<string, number> = {};
    for (const r of actuallyExpired) {
      codeCountMap[r.code] = (codeCountMap[r.code] || 0) + 1;
    }

    let decremented = 0;
    const failedCodes: string[] = [];
    for (const [code, count] of Object.entries(codeCountMap)) {
      const { data: codeRow, error: fetchErr } = await db
        .from("referral_codes")
        .select("id")
        .eq("code", code)
        .maybeSingle();

      if (fetchErr || !codeRow) {
        console.warn(`[expire-pending-referrals] Could not find referral code: ${code}`);
        failedCodes.push(code);
        continue;
      }

      const { error: decErr } = await db.rpc("decrement_referral_use_count", {
        p_code_id: codeRow.id,
        p_amount: count,
      });

      if (decErr) {
        console.warn(`[expire-pending-referrals] Failed to decrement use_count for code ${code}:`, decErr.message);
        failedCodes.push(code);
      } else {
        decremented += count;
      }
    }

    if (failedCodes.length > 0) {
      const revertIds = actuallyExpired
        .filter(r => failedCodes.includes(r.code))
        .map(r => r.id);

      if (revertIds.length > 0) {
        const { error: revertErr } = await db
          .from("referral_redemptions")
          .update({ status: "pending" })
          .in("id", revertIds)
          .eq("status", "expired");

        if (revertErr) {
          console.error("[expire-pending-referrals] Failed to revert expired status for failed decrements:", revertErr.message);
        } else {
          console.warn(`[expire-pending-referrals] Reverted ${revertIds.length} redemptions to pending due to failed use_count decrements`);
        }
      }
    }

    const revertedCount = failedCodes.length > 0
      ? actuallyExpired.filter(r => failedCodes.includes(r.code)).length
      : 0;
    const netExpired = actuallyExpired.length - revertedCount;

    console.log(`[expire-pending-referrals] Expired ${netExpired} redemptions, decremented ${decremented} use counts, reverted ${revertedCount}`);

    return new Response(
      JSON.stringify({
        expired: netExpired,
        decremented,
        reverted: revertedCount,
        expiry_days: expiryDays,
        codes_affected: Object.keys(codeCountMap).length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[expire-pending-referrals] Error:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
