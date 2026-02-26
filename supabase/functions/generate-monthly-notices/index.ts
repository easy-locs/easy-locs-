import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const dueDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    // Get all orgs
    const { data: orgs } = await supabase.from("orgs").select("id");
    if (!orgs || orgs.length === 0) {
      return new Response(JSON.stringify({ message: "No orgs found" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let totalCreated = 0;
    let totalAlerts = 0;

    for (const org of orgs) {
      // Get active tenants (no lease_end or lease_end in future)
      const { data: tenants } = await supabase
        .from("tenants")
        .select("id, name, property_id, rent_amount, charges_amount, tenant_user_id, user_id")
        .eq("org_id", org.id)
        .gt("rent_amount", 0);

      if (!tenants || tenants.length === 0) continue;

      // Filter active leases
      const activeTenants = tenants.filter((t: any) => true); // all with rent > 0

      // Check existing notices for this month
      const { data: existing } = await supabase
        .from("payment_notices")
        .select("tenant_id")
        .eq("org_id", org.id)
        .eq("month", month);

      const existingIds = new Set((existing || []).map((e: any) => e.tenant_id));

      // Generate notices for tenants that don't have one yet
      const newNotices = activeTenants
        .filter((t: any) => !existingIds.has(t.id))
        .map((t: any) => ({
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
        await supabase.from("payment_notices").insert(newNotices);
        totalCreated += newNotices.length;
      }

      // Also generate rent_calls if not existing
      const { data: existingCalls } = await supabase
        .from("rent_calls")
        .select("tenant_id")
        .eq("org_id", org.id)
        .eq("month", month);

      const existingCallIds = new Set((existingCalls || []).map((e: any) => e.tenant_id));

      const newCalls = activeTenants
        .filter((t: any) => !existingCallIds.has(t.id))
        .map((t: any) => ({
          org_id: org.id,
          tenant_id: t.id,
          property_id: t.property_id,
          month,
          rent_amount: Number(t.rent_amount) || 0,
          charges_amount: Number(t.charges_amount) || 0,
          total_amount: (Number(t.rent_amount) || 0) + (Number(t.charges_amount) || 0),
        }));

      if (newCalls.length > 0) {
        await supabase.from("rent_calls").insert(newCalls);
      }

      // === UNPAID ALERTS ===
      // Check for unpaid rent_calls older than 5 days
      const { data: unpaid } = await supabase
        .from("rent_calls")
        .select("id, tenant_id, month, total_amount")
        .eq("org_id", org.id)
        .eq("paid", false);

      if (unpaid && unpaid.length > 0) {
        // Get org owner for notifications
        const { data: orgData } = await supabase.from("orgs").select("owner_user_id").eq("id", org.id).single();

        for (const call of unpaid) {
          const tenant = activeTenants.find((t: any) => t.id === call.tenant_id);
          if (!tenant) continue;

          // Check if alert already sent for this rent_call
          const { data: existingNotif } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", orgData?.owner_user_id)
            .eq("type", "dunning")
            .like("message", `%${call.id}%`)
            .limit(1);

          if (existingNotif && existingNotif.length > 0) continue;

          // Create unpaid alert notification for landlord
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
