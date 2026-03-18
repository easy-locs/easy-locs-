import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, d?: unknown) =>
  console.log(`[RENT-CRON] ${step}${d ? ` — ${JSON.stringify(d)}` : ""}`);

/** Country-specific grace period in days */
const GRACE_DAYS: Record<string, number> = {
  FR: 5, BE: 5, LU: 5, CH: 5,
  AE: 0, SA: 0,
  US: 3, CA: 3, GB: 3,
  DE: 3, AT: 3, NL: 3,
};
const defaultGrace = 5;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const dayOfMonth = today.getDate();
  const currentMonth = todayStr.slice(0, 7); // "2026-03"

  // Next month for advance notice generation
  const nextDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const nextMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;

  let generated = 0;
  let reminded = 0;
  let lated = 0;

  try {
    // ═══ STEP 1: Generate rent calls from active leases ═══
    // Find leases where payment_day matches today (or within 5-day window for advance notice)
    const { data: leases, error: leaseErr } = await sb
      .from("leases")
      .select("id, payment_day, rent_amount, charges_amount, tenant_id, property_id, org_id, country, start_date, end_date, status")
      .in("status", ["active", "signed"])
      .not("tenant_id", "is", null);

    if (leaseErr) { log("ERROR fetching leases", leaseErr); throw leaseErr; }

    for (const lease of (leases || [])) {
      const payDay = lease.payment_day || 1;
      const leaseStart = lease.start_date ? new Date(lease.start_date) : null;
      const leaseEnd = lease.end_date ? new Date(lease.end_date) : null;

      // Skip if lease hasn't started or has ended
      if (leaseStart && leaseStart > today) continue;
      if (leaseEnd && leaseEnd < today) continue;

      // Determine which month to generate for
      const targetMonth = dayOfMonth >= payDay - 5 ? nextMonth : currentMonth;
      const dueDate = `${targetMonth}-${String(payDay).padStart(2, "0")}`;

      // Check if rent_call already exists (idempotency via unique constraint)
      const { data: existing } = await sb
        .from("rent_calls")
        .select("id")
        .eq("lease_id", lease.id)
        .eq("month", targetMonth)
        .maybeSingle();

      if (existing) continue;

      const totalAmount = (lease.rent_amount || 0) + (lease.charges_amount || 0);
      if (totalAmount <= 0) continue;

      const { error: insertErr } = await sb.from("rent_calls").insert({
        lease_id: lease.id,
        tenant_id: lease.tenant_id,
        property_id: lease.property_id,
        org_id: lease.org_id,
        month: targetMonth,
        due_date: dueDate,
        rent_amount: lease.rent_amount || 0,
        charges_amount: lease.charges_amount || 0,
        total_amount: totalAmount,
        payment_status: "pending",
        paid: false,
        paid_amount: 0,
      });

      if (insertErr) {
        // Unique constraint violation = already exists, skip
        if (insertErr.code === "23505") continue;
        log("ERROR inserting rent_call", { lease: lease.id, err: insertErr.message });
      } else {
        generated++;
      }
    }

    // ═══ STEP 2: Send reminders for unpaid rent_calls ═══
    const { data: unpaid } = await sb
      .from("rent_calls")
      .select("id, due_date, reminder_level, last_reminder_at, tenant_id, org_id, month, total_amount, lease_id")
      .eq("paid", false)
      .in("payment_status", ["pending", "reminded", "partial"])
      .not("due_date", "is", null);

    for (const rc of (unpaid || [])) {
      const dueDate = new Date(rc.due_date);
      const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / 86400000);
      const currentLevel = rc.reminder_level || 0;

      // Get lease country for grace period
      let country = "FR";
      if (rc.lease_id) {
        const { data: l } = await sb.from("leases").select("country").eq("id", rc.lease_id).maybeSingle();
        if (l?.country) country = l.country;
      }
      const grace = GRACE_DAYS[country] ?? defaultGrace;

      // Pre-due reminder: 5 days before
      if (daysPastDue >= -5 && daysPastDue < 0 && currentLevel === 0) {
        await sb.from("rent_calls").update({
          reminder_level: 0,
          last_reminder_at: todayStr,
          payment_status: "pending",
        }).eq("id", rc.id);
        // TODO: send push/email notification "Rent due soon"
        reminded++;
        continue;
      }

      // Level 1: due_date + 1 day
      if (daysPastDue >= 1 && currentLevel < 1) {
        await sb.from("rent_calls").update({
          reminder_level: 1,
          last_reminder_at: todayStr,
          payment_status: "reminded",
        }).eq("id", rc.id);
        reminded++;
        continue;
      }

      // Late: past grace period
      if (daysPastDue > grace && currentLevel < 2) {
        await sb.from("rent_calls").update({
          reminder_level: 2,
          last_reminder_at: todayStr,
          payment_status: "late",
        }).eq("id", rc.id);
        lated++;
        continue;
      }

      // Dunning: grace + 10 days
      if (daysPastDue > grace + 10 && currentLevel < 3) {
        await sb.from("rent_calls").update({
          reminder_level: 3,
          last_reminder_at: todayStr,
          payment_status: "dunning",
        }).eq("id", rc.id);
        lated++;
        continue;
      }
    }

    log("Cycle complete", { generated, reminded, lated });

    return new Response(JSON.stringify({ ok: true, generated, reminded, lated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
