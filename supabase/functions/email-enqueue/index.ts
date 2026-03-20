// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: require valid JWT or internal secret
    const authHeader = req.headers.get("Authorization");
    const internalSecret = Deno.env.get("INTERNAL_NOTIFICATION_SECRET") || "";
    const token = authHeader?.replace("Bearer ", "") || "";
    
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if it's an internal call or authenticated user
    const isInternal = internalSecret.length > 0 && token === internalSecret;
    if (!isInternal) {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader! } } }
      );
      const { data: userData, error: authErr } = await userClient.auth.getUser(token);
      if (authErr || !userData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401
        });
      }
    }

    const body = await req.json();

    const row = {
      id: `mail_${crypto.randomUUID().slice(0, 8)}`,
      to_email: body.toEmail,
      subject: body.subject,
      html: body.html,
      status: "pending",
      metadata: body.metadata ?? null,
      created_at: new Date().toISOString(),
      sent_at: null,
    };

    const { data, error } = await admin
      .from("email_queue")
      .insert(row)
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ email: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
