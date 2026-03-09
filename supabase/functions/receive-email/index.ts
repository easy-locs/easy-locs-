/**
 * Inbound Email Webhook — receives emails from SendGrid Inbound Parse
 * and routes them into the correct Communication Center thread.
 * 
 * SendGrid Inbound Parse sends a multipart/form-data POST with fields:
 * - from, to, subject, text, html, envelope, headers, attachments, etc.
 * 
 * Thread matching strategy:
 * 1. Extract booking ref from subject (pattern: [REF:xxxxxxxx])
 * 2. Match sender email to existing thread contact_email
 * 3. Fall back to tenant email lookup
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INBOUND_WEBHOOK_SECRET = Deno.env.get("INBOUND_WEBHOOK_SECRET") || "";

/** Extract email address from "Name <email@domain.com>" format */
function extractEmail(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim().toLowerCase();
}

/** Extract booking reference from subject line: [REF:abcd1234] */
function extractBookingRef(subject: string): string | null {
  const match = subject.match(/\[REF:([a-f0-9-]{8,36})\]/i);
  return match ? match[1] : null;
}

/** Clean email body: strip quoted text, signatures */
function cleanEmailBody(text: string): string {
  // Remove common reply patterns
  const lines = text.split("\n");
  const cleanLines: string[] = [];
  for (const line of lines) {
    // Stop at reply delimiter
    if (/^(>|On .+ wrote:|Le .+ a écrit :|---+\s*Original|From:.*@)/i.test(line.trim())) break;
    // Stop at common signatures
    if (/^(--|Envoyé depuis|Sent from|Get Outlook)/i.test(line.trim())) break;
    cleanLines.push(line);
  }
  return cleanLines.join("\n").trim() || text.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    let fromEmail = "";
    let subject = "";
    let textBody = "";
    let htmlBody = "";
    let messageId = "";
    let inReplyTo = "";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // SendGrid Inbound Parse sends multipart/form-data
      const formData = await req.formData();
      fromEmail = extractEmail(formData.get("from")?.toString() || "");
      subject = formData.get("subject")?.toString() || "";
      textBody = formData.get("text")?.toString() || "";
      htmlBody = formData.get("html")?.toString() || "";
      
      // Parse headers for Message-ID and In-Reply-To
      const headersRaw = formData.get("headers")?.toString() || "";
      const msgIdMatch = headersRaw.match(/Message-ID:\s*<([^>]+)>/i);
      if (msgIdMatch) messageId = msgIdMatch[1];
      const replyMatch = headersRaw.match(/In-Reply-To:\s*<([^>]+)>/i);
      if (replyMatch) inReplyTo = replyMatch[1];
    } else if (contentType.includes("application/json")) {
      // JSON format (for testing)
      const body = await req.json();
      fromEmail = extractEmail(body.from || "");
      subject = body.subject || "";
      textBody = body.text || "";
      htmlBody = body.html || "";
      messageId = body.message_id || "";
      inReplyTo = body.in_reply_to || "";
    } else {
      return new Response(JSON.stringify({ error: "Unsupported content type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!fromEmail) {
      return new Response(JSON.stringify({ error: "No sender email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanContent = cleanEmailBody(textBody || "");
    if (!cleanContent) {
      return new Response(JSON.stringify({ error: "Empty email body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[receive-email] Processing inbound from:", fromEmail, "subject:", subject);

    // ── Strategy 1: Match by booking reference in subject ──
    const bookingRef = extractBookingRef(subject);
    let matchedThread: { org_id: string; booking_id?: string; tenant_id?: string; booking_type?: string } | null = null;

    if (bookingRef) {
      // Try to find a message with this booking_id
      const { data: existingMsg } = await supabase
        .from("messages")
        .select("org_id, booking_id, tenant_id, booking_type")
        .eq("booking_id", bookingRef)
        .limit(1)
        .maybeSingle();
      
      if (existingMsg) {
        matchedThread = existingMsg;
        console.log("[receive-email] Matched by booking ref:", bookingRef);
      }
    }

    // ── Strategy 2: Match by sender email in recent messages ──
    if (!matchedThread) {
      const { data: contactMatch } = await supabase
        .from("messages")
        .select("org_id, booking_id, tenant_id, booking_type")
        .eq("contact_email", fromEmail)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (contactMatch) {
        matchedThread = contactMatch;
        console.log("[receive-email] Matched by contact_email:", fromEmail);
      }
    }

    // ── Strategy 3: Match by tenant email ──
    if (!matchedThread) {
      const { data: tenantMatch } = await supabase
        .from("tenants")
        .select("id, org_id")
        .eq("email", fromEmail)
        .limit(1)
        .maybeSingle();

      if (tenantMatch) {
        matchedThread = { org_id: tenantMatch.org_id, tenant_id: tenantMatch.id };
        console.log("[receive-email] Matched by tenant email:", fromEmail);
      }
    }

    if (!matchedThread) {
      console.warn("[receive-email] No thread match for:", fromEmail, subject);
      // Store as unmatched for manual review
      await supabase.from("audit_logs").insert({
        action: "inbound_email_unmatched",
        metadata_json: { from: fromEmail, subject, body_preview: cleanContent.slice(0, 200) },
      });
      return new Response(JSON.stringify({ status: "unmatched", from: fromEmail }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Detect sender locale from email content ──
    const senderLocale = detectLocale(cleanContent);

    // ── Insert message into thread ──
    const { error: insertErr } = await supabase.from("messages").insert({
      org_id: matchedThread.org_id,
      sender_id: null, // External sender (not a user)
      tenant_id: matchedThread.tenant_id || null,
      booking_id: matchedThread.booking_id || null,
      booking_type: matchedThread.booking_type || null,
      contact_name: fromEmail.split("@")[0],
      contact_email: fromEmail,
      content: cleanContent,
      category: "general",
      message_type: "inbound_email",
      sender_locale: senderLocale,
      inbound_message_id: messageId || null,
      read: false,
    });

    if (insertErr) {
      console.error("[receive-email] Insert failed:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to save message" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Notify owner ──
    const { data: org } = await supabase
      .from("orgs")
      .select("owner_user_id")
      .eq("id", matchedThread.org_id)
      .single();

    if (org?.owner_user_id) {
      const threadRef = matchedThread.booking_id || matchedThread.tenant_id || "";
      await supabase.from("notifications").insert({
        user_id: org.owner_user_id,
        org_id: matchedThread.org_id,
        type: "message",
        title: "📧 Email reply received",
        message: `${fromEmail}: ${cleanContent.slice(0, 100)}`,
        link: `/dashboard/messages?thread=${matchedThread.booking_id ? `booking-${matchedThread.booking_id}` : `tenant-${matchedThread.tenant_id}`}`,
        metadata_json: {
          target_type: "message",
          target_id: threadRef,
          booking_id: matchedThread.booking_id || "",
          org_id: matchedThread.org_id,
          target_url: `/dashboard/messages?thread=${matchedThread.booking_id ? `booking-${matchedThread.booking_id}` : `tenant-${matchedThread.tenant_id}`}`,
        },
      });
    }

    console.log("[receive-email] Message inserted and owner notified");

    return new Response(JSON.stringify({ status: "ok", thread: matchedThread.booking_id || matchedThread.tenant_id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[receive-email] Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/** Simple locale detection from text content */
function detectLocale(text: string): string {
  const lower = text.toLowerCase();
  const patterns: [string, RegExp][] = [
    ["fr", /\b(bonjour|merci|cordialement|salut|bonsoir|cher|chère|je vous|nous vous|madame|monsieur)\b/],
    ["es", /\b(hola|gracias|buenos|buenas|estimado|estimada|saludos|atentamente|por favor)\b/],
    ["de", /\b(hallo|danke|guten|liebe|lieber|herzlich|sehr geehrte|mit freundlichen)\b/],
    ["it", /\b(ciao|grazie|buongiorno|buonasera|gentile|cordiali|distinti saluti)\b/],
    ["pt", /\b(olá|obrigado|obrigada|bom dia|boa tarde|prezado|atenciosamente)\b/],
    ["nl", /\b(hallo|bedankt|dank|goedemorgen|geachte|met vriendelijke)\b/],
    ["tr", /\b(merhaba|teşekkür|iyi günler|sayın|selamlar)\b/],
    ["ar", /[\u0600-\u06FF]{3,}/],
    ["ja", /[\u3040-\u309F\u30A0-\u30FF]{2,}/],
    ["zh", /[\u4E00-\u9FFF]{2,}/],
    ["ko", /[\uAC00-\uD7AF]{2,}/],
  ];
  for (const [locale, pattern] of patterns) {
    if (pattern.test(lower)) return locale;
  }
  return "en";
}
