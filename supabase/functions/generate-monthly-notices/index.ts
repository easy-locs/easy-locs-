import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Validate authorization — only allow calls with the anon key (pg_cron) or service role key
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!token || (token !== anonKey && token !== serviceRoleKey)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey
    );

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const dueDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const { data: orgs } = await supabase.from("orgs").select("id");
    if (!orgs || orgs.length === 0) {
      return new Response(JSON.stringify({ message: "No orgs found" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let totalCreated = 0;
    let totalAlerts = 0;

    for (const org of orgs) {
      const { data: tenants } = await supabase
        .from("tenants")
        .select("id, name, property_id, rent_amount, charges_amount, tenant_user_id, user_id")
        .eq("org_id", org.id)
        .gt("rent_amount", 0);

      if (!tenants || tenants.length === 0) continue;

      const activeTenants = tenants;

      // Generate payment_notices using upsert to avoid duplicates
      const newNotices = activeTenants.map((t: any) => ({
        org_id: org.id,
        tenant_id: t.id,
        property_id: t.property_id,
        month,
        rent_amount: Number(t.rent_amount) || 0,
        charges_amount: Number(t.charges_amount) || 0,
        total_amount: (Number(t.rent_amount) || 0) + (Number(t.charges_amount) || 0),
        due_date: dueDate,
      }));

      if (newNotices.length > 0) {
        const { data: inserted } = await supabase
          .from("payment_notices")
          .upsert(newNotices, { onConflict: "org_id,tenant_id,month", ignoreDuplicates: true })
          .select("id");
        totalCreated += (inserted || []).length;
      }

      // Generate rent_calls using upsert to avoid duplicates
      const newCalls = activeTenants.map((t: any) => ({
        org_id: org.id,
        tenant_id: t.id,
        property_id: t.property_id,
        month,
        rent_amount: Number(t.rent_amount) || 0,
        charges_amount: Number(t.charges_amount) || 0,
        total_amount: (Number(t.rent_amount) || 0) + (Number(t.charges_amount) || 0),
      }));

      if (newCalls.length > 0) {
        await supabase
          .from("rent_calls")
          .upsert(newCalls, { onConflict: "org_id,tenant_id,month", ignoreDuplicates: true });
      }

      // === UNPAID ALERTS ===
      const { data: unpaid } = await supabase
        .from("rent_calls")
        .select("id, tenant_id, month, total_amount")
        .eq("org_id", org.id)
        .eq("paid", false);

      if (unpaid && unpaid.length > 0) {
        const { data: orgData } = await supabase.from("orgs").select("owner_user_id").eq("id", org.id).single();

        for (const call of unpaid) {
          const tenant = activeTenants.find((t: any) => t.id === call.tenant_id);
          if (!tenant) continue;

          const { data: existingNotif } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", orgData?.owner_user_id)
            .eq("type", "dunning")
            .like("message", `%${call.id}%`)
            .limit(1);

          if (existingNotif && existingNotif.length > 0) continue;

          if (orgData?.owner_user_id) {
            await supabase.from("notifications").insert({
              user_id: orgData.owner_user_id,
              org_id: org.id,
              type: "dunning",
              title: `⚠️ Loyer impayé — ${tenant.name}`,
              message: `Le loyer de ${call.month} (${call.total_amount}€) est impayé. Ref: ${call.id}`,
              link: "/dashboard/dunning",
            });
            totalAlerts++;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, notices_created: totalCreated, alerts_sent: totalAlerts, month }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
