import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { sendEmailViaSES, hasSesCredentials } from "../_shared/aws-ses.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";
import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
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

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;

  try {
    const rlResult = await checkServerRateLimit(req, "send-email");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

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

    if (typeof payload.subject !== "string" || payload.subject.length > 500) {
      return new Response(JSON.stringify({ error: "Subject too long (max 500 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.from_name) {
      if (typeof payload.from_name !== "string" || payload.from_name.length > 100) {
        return new Response(JSON.stringify({ error: "from_name too long (max 100 chars)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      payload.from_name = payload.from_name.replace(/[\x00-\x1F\x7F]/g, "").trim();
    }

    if (typeof payload.html !== "string" || payload.html.length > 1_000_000) {
      return new Response(JSON.stringify({ error: "HTML content too large (max 1MB)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let prevHtml = "";
    while (prevHtml !== payload.html) {
      prevHtml = payload.html;
      payload.html = payload.html.replace(/<\s*\/?\s*(script|iframe|object|embed|form|base|applet|meta|link|style|svg|math|xmp|noscript|noembed|noframes)\b[^>]*>/gi, "");
      payload.html = payload.html.replace(/<!--[\s\S]*?-->/g, "");
    }
    payload.html = payload.html.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
    payload.html = payload.html.replace(/(href|src|action|formaction|xlink:href|poster|background)\s*=\s*(?:"[^"]*(?:javascript|data|vbscript)\s*:[^"]*"|'[^']*(?:javascript|data|vbscript)\s*:[^']*')/gi, "");
    payload.html = payload.html.replace(/style\s*=\s*(?:"[^"]*(?:expression|url|import)\s*\([^"]*"|'[^']*(?:expression|url|import)\s*\([^']*')/gi, "");

    if (payload.attachments?.length) {
      let totalSize = 0;
      const safeFilenameRegex = /^[a-zA-Z0-9À-ÿ\s\-_\.()]+$/;
      for (const att of payload.attachments) {
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
        totalSize += Math.ceil((att.content?.length || 0) * 0.75);
      }
      if (totalSize > 10_000_000) {
        return new Response(JSON.stringify({ error: "Total attachment size too large (max 10MB)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

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

    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: suppressions } = await serviceSupabase
      .from("email_suppressions")
      .select("email_address")
      .in("email_address", validRecipients);

    const suppressedSet = new Set((suppressions ?? []).map((s: { email_address: string }) => s.email_address));
    const unsuppressedRecipients = validRecipients.filter(e => !suppressedSet.has(e));

    if (suppressedSet.size > 0) {
      console.warn(`[send-email] Suppressed ${suppressedSet.size} recipients (bounce/complaint)`);
    }

    if (unsuppressedRecipients.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "All recipients are suppressed (bounce/complaint)" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let provider: "ses" | "sendgrid" = "sendgrid";
    let sendSuccess = false;

    if (hasSesCredentials()) {
      const sesResult = await sendEmailViaSES({
        to: unsuppressedRecipients,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        fromName,
        fromEmail,
        replyTo,
        attachments: payload.attachments,
      });

      if (sesResult.success) {
        sendSuccess = true;
        provider = "ses";
        console.log("[send-email] Sent via SES, messageId:", sesResult.messageId);
      } else {
        console.warn("[send-email] SES failed, falling back to SendGrid:", sesResult.error);
      }
    }

    if (!sendSuccess) {
      const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
      if (!SENDGRID_API_KEY) {
        throw new Error("Neither SES nor SendGrid is configured");
      }

      const sgPayload: Record<string, unknown> = {
        personalizations: [{ to: unsuppressedRecipients.map((email) => ({ email })) }],
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

      provider = "sendgrid";
    }

    if (orgMember?.org_id) {
      await supabase.from("audit_logs").insert({
        org_id: orgMember.org_id,
        user_id: user.id,
        action: "email_sent",
        metadata_json: {
          to: recipients,
          subject: payload.subject,
          has_attachments: !!payload.attachments?.length,
          provider,
        },
      });
    }

    return new Response(JSON.stringify({ success: true, provider }), {
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
