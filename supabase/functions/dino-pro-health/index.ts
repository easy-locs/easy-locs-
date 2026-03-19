/**
 * dino-pro-health — Edge function to check professional profile completeness
 * and trigger remediation jobs + notifications.
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { proId, email, missingPhotos, missingCategories } = await req.json();

    if (!proId) {
      return new Response(JSON.stringify({ error: "Missing proId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actions: string[] = [];

    if (missingPhotos) {
      await supabase.from("dino_sync_jobs").insert({
        job_type: "normalize_media",
        entity_type: "pro",
        entity_id: proId,
        priority: 15,
      });
      await supabase.from("dino_notifications").insert({
        actor_type: "pro",
        actor_id: proId,
        channel: "email",
        template_key: "missing_photos_reminder",
        payload_json: { email },
        status: "pending",
      });
      actions.push("enqueued_media_normalization", "queued_photo_reminder");
    }

    if (missingCategories) {
      await supabase.from("dino_sync_jobs").insert({
        job_type: "cleanup_categories",
        entity_type: "pro",
        entity_id: proId,
        priority: 15,
      });
      await supabase.from("dino_notifications").insert({
        actor_type: "pro",
        actor_id: proId,
        channel: "email",
        template_key: "missing_categories_reminder",
        payload_json: { email },
        status: "pending",
      });
      actions.push("enqueued_category_cleanup", "queued_category_reminder");
    }

    console.log(`Pro health check for ${proId}: ${actions.join(", ") || "healthy"}`);
    return new Response(JSON.stringify({ ok: true, actions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Pro health error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
