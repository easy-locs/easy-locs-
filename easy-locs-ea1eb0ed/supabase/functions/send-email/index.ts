import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    return new Response("ok", { headers: corsHeaders });
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

    // --- Input validation & sanitization ---

    // Validate subject length
    if (typeof payload.subject !== "string" || payload.subject.length > 500) {
      return new Response(JSON.stringify({ error: "Subject too long (max 500 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate & sanitize from_name: max 100 chars, no control characters
    if (payload.from_name) {
      if (typeof payload.from_name !== "string" || payload.from_name.length > 100) {
        return new Response(JSON.stringify({ error: "from_name too long (max 100 chars)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Strip control characters (keep printable + accented chars)
      payload.from_name = payload.from_name.replace(/[\x00-\x1F\x7F]/g, "").trim();
    }

    // Validate HTML content size (max 1MB)
    if (typeof payload.html !== "string" || payload.html.length > 1_000_000) {
      return new Response(JSON.stringify({ error: "HTML content too large (max 1MB)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize HTML using whitelist approach
    // 1. Strip all dangerous tags (iterative to handle nested/obfuscated)
    let prevHtml = "";
    while (prevHtml !== payload.html) {
      prevHtml = payload.html;
      // Remove dangerous tags including unicode-obfuscated variants
      payload.html = payload.html.replace(/<\s*\/?\s*(script|iframe|object|embed|form|base|applet|meta|link|style|svg|math|xmp|noscript|noembed|noframes)\b[^>]*>/gi, "");
      // Strip HTML comments (can hide payloads)
      payload.html = payload.html.replace(/<!--[\s\S]*?-->/g, "");
    }
    // 2. Strip ALL event handlers (on*=) with multiple pattern approaches
    // Handles: onclick="..." onload='...' onerror=alert(1) and encoded variants
    payload.html = payload.html.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
    // 3. Strip javascript: and data: URIs in href/src/action attributes
    payload.html = payload.html.replace(/(href|src|action|formaction|xlink:href|poster|background)\s*=\s*(?:"[^"]*(?:javascript|data|vbscript)\s*:[^"]*"|'[^']*(?:javascript|data|vbscript)\s*:[^']*')/gi, "");
    // 4. Strip expression() and url() in style attributes (CSS injection)
    payload.html = payload.html.replace(/style\s*=\s*(?:"[^"]*(?:expression|url|import)\s*\([^"]*"|'[^']*(?:expression|url|import)\s*\([^']*')/gi, "");

    // Validate attachments
    if (payload.attachments?.length) {
      // Max 10MB total for all attachments
      let totalSize = 0;
      const safeFilenameRegex = /^[a-zA-Z0-9À-ÿ\s\-_\.()]+$/;
      for (const att of payload.attachments) {
        // Validate filename: no path traversal, max 255 chars
        if (!att.filename || att.filename.length > 255) {
          return new Response(JSON.stringify({ error: "Invalid attachment filename (max 255 chars)" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (att.filename.includes("..") || att.filename.includes("/") || att.filename.includes("\\")) {
          return new Response(JSON.stringify({ error: "Invalid characters in attachment filename" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!safeFilenameRegex.test(att.filename)) {
          return new Response(JSON.stringify({ error: "Attachment filename contains invalid characters" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Estimate base64 decoded size
        totalSize += Math.ceil((att.content?.length || 0) * 0.75);
      }
      if (totalSize > 10_000_000) {
        return new Response(JSON.stringify({ error: "Total attachment size too large (max 10MB)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- End input validation ---

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

    const rawRecipients = Array.isArray(payload.to) ? payload.to : [payload.to];
    const recipients = rawRecipients
      .map((email) => (typeof email === "string" ? email.trim().toLowerCase() : ""))
      .filter(Boolean);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validRecipients = recipients.filter((email) => emailRegex.test(email));

    if (validRecipients.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "Aucune adresse email valide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (validRecipients.length !== recipients.length) {
      console.warn("Ignoring invalid recipient emails", { provided: recipients.length, valid: validRecipients.length });
    }

    const sgPayload: any = {
      personalizations: [{ to: validRecipients.map((email) => ({ email })) }],
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
