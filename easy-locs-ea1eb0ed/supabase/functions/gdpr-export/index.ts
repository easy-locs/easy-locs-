import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );
    const { data: { user } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    const TABLES_USER_ID = [
      "profiles",
      "wallet_transactions",
      "documents",
      "leases",
      "tenants",
      "properties",
      "app_notifications",
      "audit_logs",
      "bookings",
      "favorites",
      "reviews",
      "support_tickets",
    ];

    const TABLES_OWNER = [
      "owner_profiles",
      "orgs",
    ];

    const exportData: Record<string, unknown[]> = {};

    for (const table of TABLES_USER_ID) {
      try {
        const { data } = await supabase
          .from(table)
          .select("*")
          .or(`user_id.eq.${userId},owner_user_id.eq.${userId},id.eq.${userId}`)
          .limit(5000);
        if (data && data.length > 0) exportData[table] = data;
      } catch {}
    }

    for (const table of TABLES_OWNER) {
      try {
        const { data } = await supabase
          .from(table)
          .select("*")
          .or(`user_id.eq.${userId},id.eq.${userId}`)
          .limit(1000);
        if (data && data.length > 0) exportData[table] = data;
      } catch {}
    }

    try {
      const { data: msgs } = await supabase
        .from("orbit_messages")
        .select("id, conversation_id, sender_id, content_type, created_at")
        .eq("sender_id", userId)
        .limit(5000);
      if (msgs && msgs.length > 0) exportData["orbit_messages_metadata"] = msgs;
    } catch {}

    try {
      const { data: convos } = await supabase
        .from("orbit_conversations")
        .select("id, type, created_at, updated_at")
        .contains("participant_ids", [userId])
        .limit(1000);
      if (convos && convos.length > 0) exportData["orbit_conversations"] = convos;
    } catch {}

    try {
      const { data: payments } = await supabase
        .from("payment_transactions")
        .select("*")
        .or(`user_id.eq.${userId},payer_id.eq.${userId}`)
        .limit(5000);
      if (payments && payments.length > 0) exportData["payment_transactions"] = payments;
    } catch {}

    exportData["_export_metadata"] = [{
      exported_at: new Date().toISOString(),
      user_id: userId,
      email: user.email,
      gdpr_article: "Art. 20 — Right to data portability",
      tables_queried: [...TABLES_USER_ID, ...TABLES_OWNER, "orbit_messages_metadata", "orbit_conversations", "payment_transactions"],
      format: "JSON",
    }];

    await supabase.from("audit_logs").insert({
      user_id: userId,
      action: "gdpr_data_export",
      metadata_json: { exported_at: new Date().toISOString(), tables: Object.keys(exportData) },
    });

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        ...cors,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="easylocs-gdpr-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Export failed", detail: String(err) }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
