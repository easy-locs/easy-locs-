import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, d?: unknown) =>
  console.log(`[RENT-CRON] ${step}${d ? ` — ${JSON.stringify(d)}` : ""}`);

const GRACE_DAYS: Record<string, number> = {
  FR: 5, BE: 5, LU: 5, CH: 5,
  AE: 0, SA: 0,
  US: 3, CA: 3, GB: 3,
  DE: 3, AT: 3, NL: 3,
};
const defaultGrace = 5;

const SYSTEM_SENDER = "00000000-0000-0000-0000-000000000000";

async function notify(
  sb: ReturnType<typeof createClient>,
  userId: string,
  title: string,
  message: string,
  type: string,
  link: string,
  meta: Record<string, unknown>,
) {
  await sb.from("notifications").insert({
    user_id: userId,
    title,
    message,
    type,
    link,
    metadata_json: meta,
  });
}

async function orbitSystemMessage(
  sb: ReturnType<typeof createClient>,
  threadId: string | null,
  orgId: string,
  content: string,
  contextType: string,
  contextId: string,
) {
  if (!threadId) return;
  await sb.from("messages").insert({
    thread_id: threadId,
    org_id: orgId,
    sender_id: SYSTEM_SENDER,
    content,
    message_type: "system",
    category: "payment",
    context_type: contextType,
    context_id: contextId,
  });
}

async function getTenantUserId(sb: ReturnType<typeof createClient>, tenantId: string): Promise<string | null> {
  const { data } = await sb.from("tenants").select("tenant_user_id").eq("id", tenantId).maybeSingle();
  return data?.tenant_user_id || null;
}

async function findOrCreateThread(
  sb: ReturnType<typeof createClient>,
  orgId: string,
  tenantUserId: string,
  contextType: string,
  contextId: string,
): Promise<string | null> {
  // Try to find existing thread for this context
  const { data: existing } = await sb
    .from("conversation_threads")
    .select("id")
    .eq("context_type", contextType)
    .eq("context_id", contextId)
    .maybeSingle();

  if (existing) return existing.id;

  // Create new thread
  const { data: newThread } = await sb
    .from("conversation_threads")
    .insert({
      org_id: orgId,
      initiator_id: SYSTEM_SENDER,
      context_type: contextType,
      context_id: contextId,
      participant_ids: [tenantUserId],
      status: "open",
    })
    .select("id")
    .single();

  return newThread?.id || null;
}

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
  const currentMonth = todayStr.slice(0, 7);
  const nextDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const nextMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;

  let generated = 0, reminded = 0, lated = 0, receiptsGenerated = 0;

  try {
    // ═══ STEP 1: Generate rent calls from active leases ═══
    const { data: leases, error: leaseErr } = await sb
      .from("leases")
      .select("id, payment_day, rent_amount, charges_amount, tenant_id, property_id, org_id, country, start_date, end_date, status")
      .in("status", ["active", "signed"])
      .not("tenant_id", "is", null);

    if (leaseErr) throw leaseErr;

    for (const lease of (leases || [])) {
      const payDay = lease.payment_day || 1;
      const leaseStart = lease.start_date ? new Date(lease.start_date) : null;
      const leaseEnd = lease.end_date ? new Date(lease.end_date) : null;

      if (leaseStart && leaseStart > today) continue;
      if (leaseEnd && leaseEnd < today) continue;

      const targetMonth = dayOfMonth >= payDay - 5 ? nextMonth : currentMonth;
      const dueDate = `${targetMonth}-${String(Math.min(payDay, 28)).padStart(2, "0")}`;

      const { data: existing } = await sb
        .from("rent_calls")
        .select("id")
        .eq("lease_id", lease.id)
        .eq("month", targetMonth)
        .maybeSingle();

      if (existing) continue;

      const totalAmount = (lease.rent_amount || 0) + (lease.charges_amount || 0);
      if (totalAmount <= 0) continue;

      const { data: newRc, error: insertErr } = await sb.from("rent_calls").insert({
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
      }).select("id").single();

      if (insertErr) {
        if (insertErr.code === "23505") continue;
        log("ERROR inserting rent_call", { lease: lease.id, err: insertErr.message });
        continue;
      }

      generated++;

      // Notify tenant about new rent call
      const tenantUserId = await getTenantUserId(sb, lease.tenant_id);
      if (tenantUserId && newRc) {
        await notify(sb, tenantUserId,
          "Loyer à payer",
          `Votre loyer de ${totalAmount.toFixed(2)} € pour ${targetMonth} est maintenant dû.`,
          "payment", "/tenant/pay",
          { rent_call_id: newRc.id, month: targetMonth, amount: totalAmount },
        );

        // Create/find Orbit thread and send system message
        const threadId = await findOrCreateThread(sb, lease.org_id, tenantUserId, "rent_call", newRc.id);
        await orbitSystemMessage(sb, threadId, lease.org_id,
          `📋 Avis de loyer — ${targetMonth}\nMontant: ${totalAmount.toFixed(2)} €\nÉchéance: ${dueDate}`,
          "rent_call", newRc.id,
        );
      }
    }

    // ═══ STEP 2: Reminders & escalation ═══
    const { data: unpaid } = await sb
      .from("rent_calls")
      .select("id, due_date, reminder_level, last_reminder_at, tenant_id, org_id, month, total_amount, lease_id, payment_status")
      .eq("paid", false)
      .in("payment_status", ["pending", "reminded", "partial"])
      .not("due_date", "is", null);

    for (const rc of (unpaid || [])) {
      const dueDate = new Date(rc.due_date);
      const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / 86400000);
      const currentLevel = rc.reminder_level || 0;

      let country = "FR";
      if (rc.lease_id) {
        const { data: l } = await sb.from("leases").select("country").eq("id", rc.lease_id).maybeSingle();
        if (l?.country) country = l.country;
      }
      const grace = GRACE_DAYS[country] ?? defaultGrace;
      const tenantUserId = await getTenantUserId(sb, rc.tenant_id);

      // Pre-due: 5 days before
      if (daysPastDue >= -5 && daysPastDue < 0 && currentLevel === 0) {
        await sb.from("rent_calls").update({ last_reminder_at: todayStr }).eq("id", rc.id);
        if (tenantUserId) {
          await notify(sb, tenantUserId, "Loyer bientôt dû",
            `Votre loyer de ${rc.total_amount.toFixed(2)} € pour ${rc.month} est dû dans ${Math.abs(daysPastDue)} jours.`,
            "payment", "/tenant/pay", { rent_call_id: rc.id, level: 0 });
        }
        reminded++;
        continue;
      }

      // Level 1: due_date + 1
      if (daysPastDue >= 1 && currentLevel < 1) {
        await sb.from("rent_calls").update({
          reminder_level: 1, last_reminder_at: todayStr, payment_status: "reminded",
        }).eq("id", rc.id);
        if (tenantUserId) {
          await notify(sb, tenantUserId, "Rappel de loyer",
            `Votre loyer de ${rc.total_amount.toFixed(2)} € pour ${rc.month} est en attente de paiement.`,
            "payment", "/tenant/pay", { rent_call_id: rc.id, level: 1 });

          const threadId = await findOrCreateThread(sb, rc.org_id, tenantUserId, "rent_call", rc.id);
          await orbitSystemMessage(sb, threadId, rc.org_id,
            `⚠️ Rappel — Loyer ${rc.month} en attente (${rc.total_amount.toFixed(2)} €)`,
            "rent_call", rc.id);
        }
        reminded++;
        continue;
      }

      // Late: past grace
      if (daysPastDue > grace && currentLevel < 2) {
        await sb.from("rent_calls").update({
          reminder_level: 2, last_reminder_at: todayStr, payment_status: "late",
        }).eq("id", rc.id);
        if (tenantUserId) {
          await notify(sb, tenantUserId, "Loyer en retard",
            `Votre loyer pour ${rc.month} est en retard. Veuillez régulariser.`,
            "payment", "/tenant/pay", { rent_call_id: rc.id, level: 2 });

          const threadId = await findOrCreateThread(sb, rc.org_id, tenantUserId, "rent_call", rc.id);
          await orbitSystemMessage(sb, threadId, rc.org_id,
            `🔴 Retard — Loyer ${rc.month} impayé (${rc.total_amount.toFixed(2)} €)`,
            "rent_call", rc.id);
        }
        // Also notify landlord
        const { data: orgMembers } = await sb.from("org_members").select("user_id").eq("org_id", rc.org_id);
        for (const m of (orgMembers || [])) {
          await notify(sb, m.user_id, "Loyer impayé",
            `Le loyer de ${rc.month} pour le locataire est en retard.`,
            "payment", "/dashboard/payment-notices", { rent_call_id: rc.id, level: 2 });
        }
        lated++;
        continue;
      }

      // Dunning: grace + 10
      if (daysPastDue > grace + 10 && currentLevel < 3) {
        await sb.from("rent_calls").update({
          reminder_level: 3, last_reminder_at: todayStr, payment_status: "dunning",
        }).eq("id", rc.id);
        if (tenantUserId) {
          await notify(sb, tenantUserId, "Mise en demeure",
            `Votre loyer pour ${rc.month} est sérieusement en retard. Action requise immédiatement.`,
            "payment", "/tenant/pay", { rent_call_id: rc.id, level: 3 });
        }
        lated++;
        continue;
      }
    }

    // ═══ STEP 3: Auto-generate receipts for paid rent_calls ═══
    const { data: paidNoReceipt } = await sb
      .from("rent_calls")
      .select("id, paid_amount, total_amount, receipt_pdf_url")
      .eq("payment_status", "paid")
      .is("receipt_pdf_url", null);

    for (const rc of (paidNoReceipt || [])) {
      if (rc.paid_amount < rc.total_amount) continue;

      // Call receipt generation function
      try {
        const receiptUrl = Deno.env.get("SUPABASE_URL") + "/functions/v1/generate-rent-receipt";
        const resp = await fetch(receiptUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ rent_call_id: rc.id }),
        });
        if (resp.ok) receiptsGenerated++;
        else log("Receipt gen failed", { id: rc.id, status: resp.status });
      } catch (e) {
        log("Receipt gen error", { id: rc.id, err: String(e) });
      }
    }

    log("Cycle complete", { generated, reminded, lated, receiptsGenerated });

    return new Response(JSON.stringify({ ok: true, generated, reminded, lated, receiptsGenerated }), {
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
