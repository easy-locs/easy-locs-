/**
 * expire-listings — Daily scheduled job
 * Marks sale listings as expired when listing_expires_at < now()
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date().toISOString();

    // Find active sale listings that have expired
    const { data: expired, error: fetchErr } = await supabase
      .from("marketplace_services")
      .select("id, title")
      .eq("auto_expire", true)
      .eq("active", true)
      .not("listing_expires_at", "is", null)
      .lt("listing_expires_at", now);

    if (fetchErr) throw fetchErr;

    if (!expired || expired.length === 0) {
      return new Response(
        JSON.stringify({ message: "No expired listings", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ids = expired.map((l: any) => l.id);

    // Mark as expired — keep in DB but hide from public
    const { error: updateErr } = await supabase
      .from("marketplace_services")
      .update({
        active: false,
        status: "archived", // closest enum value for expired
        archived_at: now,
        updated_at: now,
      })
      .in("id", ids);

    if (updateErr) throw updateErr;

    console.log(`[expire-listings] Expired ${ids.length} sale listings`);

    return new Response(
      JSON.stringify({
        message: `Expired ${ids.length} sale listings`,
        count: ids.length,
        ids,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[expire-listings] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
