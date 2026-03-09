import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Authorization check — only allow service role key or dedicated cron secret
    const authHeader = req.headers.get("authorization") || "";
    const callerToken = authHeader.replace("Bearer ", "").trim();
    const cronSecret = req.headers.get("x-cron-secret") || "";

    let authorized = false;
    if (callerToken === serviceKey) {
      authorized = true;
    } else if (cronSecret) {
      const { data: cfg } = await supabase
        .from("internal_config")
        .select("value")
        .eq("key", "cron_secret")
        .single();
      if (cfg && cfg.value === cronSecret) authorized = true;
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get current month
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const reportMonth = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;

    // Get all orgs
    const { data: orgs } = await supabase.from("orgs").select("id, owner_user_id, name, country");
    if (!orgs || orgs.length === 0) {
      return new Response(JSON.stringify({ message: "No orgs found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let reportsGenerated = 0;

    for (const org of orgs) {
      // Get rent calls for previous month
      const { data: rentCalls } = await supabase
        .from("rent_calls")
        .select("*, tenants:tenant_id(name), properties:property_id(label, address, city)")
        .eq("org_id", org.id)
        .eq("month", reportMonth);

      if (!rentCalls || rentCalls.length === 0) continue;

      const totalRent = rentCalls.reduce((sum: number, r: any) => sum + (r.rent_amount || 0), 0);
      const totalCharges = rentCalls.reduce((sum: number, r: any) => sum + (r.charges_amount || 0), 0);
      const totalAmount = rentCalls.reduce((sum: number, r: any) => sum + (r.total_amount || 0), 0);
      const paidCount = rentCalls.filter((r: any) => r.paid).length;
      const unpaidCount = rentCalls.length - paidCount;

      // Get expenses for the month
      const monthStart = `${reportMonth}-01`;
      const monthEnd = `${reportMonth}-31`;
      const { data: expenses } = await supabase
        .from("expenses")
        .select("amount, category, label")
        .eq("org_id", org.id)
        .gte("expense_date", monthStart)
        .lte("expense_date", monthEnd);

      const totalExpenses = (expenses || []).reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

      // Build report data
      const reportData = {
        month: reportMonth,
        org_name: org.name,
        summary: {
          total_properties: new Set(rentCalls.map((r: any) => r.property_id)).size,
          total_tenants: new Set(rentCalls.map((r: any) => r.tenant_id)).size,
          total_rent: totalRent,
          total_charges: totalCharges,
          total_amount: totalAmount,
          paid_count: paidCount,
          unpaid_count: unpaidCount,
          collection_rate: rentCalls.length > 0 ? Math.round((paidCount / rentCalls.length) * 100) : 0,
          total_expenses: totalExpenses,
          net_income: totalAmount - totalExpenses,
        },
        rent_details: rentCalls.map((r: any) => ({
          tenant: r.tenants?.name || "N/A",
          property: r.properties?.label || "N/A",
          rent: r.rent_amount,
          charges: r.charges_amount,
          total: r.total_amount,
          paid: r.paid,
          paid_date: r.paid_date,
        })),
        expense_details: (expenses || []).map((e: any) => ({
          label: e.label,
          category: e.category,
          amount: e.amount,
        })),
      };

      // Insert monthly report document
      await supabase.from("documents").insert({
        org_id: org.id,
        user_id: org.owner_user_id,
        doc_type: "monthly-report",
        title: `Rapport mensuel ${reportMonth}`,
        country: org.country || "FR",
        data_json: reportData,
        status: "generated",
      });

      // Create notification
      await supabase.from("notifications").insert({
        user_id: org.owner_user_id,
        org_id: org.id,
        type: "info",
        title: "📊 Rapport mensuel disponible",
        message: `Votre rapport de ${reportMonth} est prêt. Taux de recouvrement : ${reportData.summary.collection_rate}%`,
        link: "/dashboard/documents",
      });

      reportsGenerated++;
    }

    return new Response(JSON.stringify({ success: true, reports_generated: reportsGenerated, month: reportMonth }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[MONTHLY-REPORT]", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
