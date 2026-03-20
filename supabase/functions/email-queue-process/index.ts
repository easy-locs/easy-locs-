// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: emails, error } = await admin
      .from("email_queue")
      .select("*")
      .eq("status", "pending")
      .limit(20);

    if (error) throw error;

    for (const email of emails ?? []) {
      try {
        // TODO: replace with real provider call (Resend / SendGrid / Mailgun)
        console.log(`[email-send] to=${email.to_email} subject=${email.subject}`);

        await admin
          .from("email_queue")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", email.id);
      } catch (sendError: any) {
        await admin
          .from("email_queue")
          .update({ status: "failed" })
          .eq("id", email.id);

        console.error("Email send failed:", sendError?.message ?? sendError);
      }
    }

    return new Response(
      JSON.stringify({ processed: emails?.length ?? 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
