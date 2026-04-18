import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: owners, error: ownersError } = await admin
      .from("profiles")
      .select("*")
      .in("role", ["owner", "seller", "admin"]);

    if (ownersError) throw ownersError;

    for (const owner of owners ?? []) {
      const [{ data: listings }, { data: bookings }, { data: rentPayments }] = await Promise.all([
        admin.from("property_listings_v2").select("*").eq("owner_orbit_id", owner.id),
        admin.from("bookings_v2").select("*").eq("owner_orbit_id", owner.id),
        admin.from("rent_payments").select("*").eq("owner_orbit_id", owner.id),
      ]);

      const totalListings = listings?.length ?? 0;
      const publishedListings = (listings ?? []).filter((x: any) => x.status === "published").length;
      const totalBookings = bookings?.length ?? 0;
      const confirmedBookings = (bookings ?? []).filter((x: any) => x.status === "confirmed").length;
      const completedBookings = (bookings ?? []).filter((x: any) => x.status === "completed").length;
      const grossRevenue = (bookings ?? [])
        .filter((x: any) => ["confirmed", "completed"].includes(x.status))
        .reduce((sum: number, x: any) => sum + Number(x.amount ?? 0), 0);

      const pendingRentAmount = (rentPayments ?? [])
        .filter((x: any) => x.status === "pending")
        .reduce((sum: number, x: any) => sum + Number(x.amount ?? 0), 0);

      const paidRentAmount = (rentPayments ?? [])
        .filter((x: any) => x.status === "paid")
        .reduce((sum: number, x: any) => sum + Number(x.amount ?? 0), 0);

      await admin.from("seller_kpi_snapshots").insert({
        id: `kpi_${crypto.randomUUID().slice(0, 8)}`,
        owner_orbit_id: owner.id,
        total_listings: totalListings,
        published_listings: publishedListings,
        total_bookings: totalBookings,
        confirmed_bookings: confirmedBookings,
        completed_bookings: completedBookings,
        gross_revenue: grossRevenue,
        pending_rent_amount: pendingRentAmount,
        paid_rent_amount: paidRentAmount,
        created_at: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
