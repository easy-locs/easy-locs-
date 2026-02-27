import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from_name?: string;
  attachments?: Array<{
    content: string; // base64
    filename: string;
    type: string;
  }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
    if (!SENDGRID_API_KEY) {
      throw new Error("SENDGRID_API_KEY is not configured");
    }

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: EmailPayload = await req.json();

    if (!payload.to || !payload.subject || !payload.html) {
      return new Response(JSON.stringify({ error: "Missing required fields: to, subject, html" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get org info for sender
    const { data: orgMember } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    const fromEmail = "noreply@easy-locs.com";
    const replyTo = "contact@easy-locs.com";
    let fromName = payload.from_name || "Easy-Locs";

    if (orgMember?.org_id) {
      const { data: org } = await supabase
        .from("orgs")
        .select("name")
        .eq("id", orgMember.org_id)
        .single();
      if (org?.name) fromName = payload.from_name || org.name;
    }

    const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];

    const sgPayload: any = {
      personalizations: [{ to: recipients.map((email) => ({ email })) }],
      from: { email: fromEmail, name: fromName },
      reply_to: { email: replyTo, name: fromName },
      subject: payload.subject,
      content: [
        ...(payload.text ? [{ type: "text/plain", value: payload.text }] : []),
        { type: "text/html", value: payload.html },
      ],
    };

    if (payload.attachments?.length) {
      sgPayload.attachments = payload.attachments.map((a) => ({
        content: a.content,
        filename: a.filename,
        type: a.type,
        disposition: "attachment",
      }));
    }

    const sgResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sgPayload),
    });

    if (!sgResponse.ok) {
      const errorBody = await sgResponse.text();
      console.error("SendGrid error:", sgResponse.status, errorBody);
      throw new Error(`SendGrid API failed [${sgResponse.status}]: ${errorBody}`);
    }

    // Log to audit
    if (orgMember?.org_id) {
      await supabase.from("audit_logs").insert({
        org_id: orgMember.org_id,
        user_id: user.id,
        action: "email_sent",
        metadata_json: {
          to: recipients,
          subject: payload.subject,
          has_attachments: !!payload.attachments?.length,
        },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error sending email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
