/**
 * Inbound Email Webhook — receives emails from SendGrid Inbound Parse
 * and routes them into the correct Communication Center thread.
 * 
 * Thread matching: booking ref → contact_email → tenant email
 * Auto-translates for owner when languages differ.
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { openaiChat } from "../_shared/openai-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function extractEmail(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim().toLowerCase();
}

function extractBookingRef(subject: string): string | null {
  const match = subject.match(/\[REF:([a-f0-9-]{8,36})\]/i);
  return match ? match[1] : null;
}

function cleanEmailBody(text: string): string {
  const lines = text.split("\n");
  const cleanLines: string[] = [];
  for (const line of lines) {
    if (/^(>|On .+ wrote:|Le .+ a écrit :|---+\s*Original|From:.*@)/i.test(line.trim())) break;
    if (/^(--|Envoyé depuis|Sent from|Get Outlook)/i.test(line.trim())) break;
    cleanLines.push(line);
  }
  return cleanLines.join("\n").trim() || text.trim();
}

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
    ["pl", /\b(cześć|dziękuję|dzień dobry|pozdrawiam|szanowny)\b/],
    ["ru", /[\u0400-\u04FF]{3,}/],
    ["ar", /[\u0600-\u06FF]{3,}/],
    ["ja", /[\u3040-\u309F\u30A0-\u30FF]{2,}/],
    ["zh", /[\u4E00-\u9FFF]{2,}/],
    ["ko", /[\uAC00-\uD7AF]{2,}/],
    ["th", /[\u0E00-\u0E7F]{2,}/],
    ["vi", /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/],
    ["hi", /[\u0900-\u097F]{3,}/],
  ];
  for (const [locale, pattern] of patterns) {
    if (pattern.test(lower)) return locale;
  }
  return "en";
}

async function translateText(text: string, fromLocale: string, toLocale: string): Promise<string | null> {
  if (fromLocale === toLocale) return null;
  if (!Deno.env.get("OPENAI_API_KEY")) return null;

  const names: Record<string, string> = {
    fr: "French", en: "English", es: "Spanish", de: "German", it: "Italian",
    pt: "Portuguese", nl: "Dutch", ar: "Arabic", tr: "Turkish", pl: "Polish",
    ru: "Russian", ja: "Japanese", ko: "Korean", zh: "Chinese", th: "Thai",
    vi: "Vietnamese", hi: "Hindi",
  };
  try {
    const res = await openaiChat({
      messages: [
        { role: "system", content: `Translate from ${names[fromLocale] || fromLocale} to ${names[toLocale] || toLocale}. Return ONLY the translation.` },
        { role: "user", content: text },
      ],
      max_tokens: 2000, temperature: 0.1,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  // ── Webhook authentication: verify shared secret ──
  const WEBHOOK_SECRET = Deno.env.get("SENDGRID_INBOUND_SECRET");
  if (WEBHOOK_SECRET) {
    const providedSecret = req.headers.get("x-webhook-secret") ||
      new URL(req.url).searchParams.get("secret");
    if (providedSecret !== WEBHOOK_SECRET) {
      console.warn("[receive-email] Rejected: invalid webhook secret");
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else {
    // If no secret is configured, reject all requests as a safety measure
    console.error("[receive-email] SENDGRID_INBOUND_SECRET not configured — rejecting request");
    return new Response(JSON.stringify({ error: "Webhook not configured" }), {
      status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    let fromEmail = "", subject = "", textBody = "", messageId = "";

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      fromEmail = extractEmail(formData.get("from")?.toString() || "");
      subject = formData.get("subject")?.toString() || "";
      textBody = formData.get("text")?.toString() || "";
      const headersRaw = formData.get("headers")?.toString() || "";
      const msgIdMatch = headersRaw.match(/Message-ID:\s*<([^>]+)>/i);
      if (msgIdMatch) messageId = msgIdMatch[1];
    } else if (contentType.includes("application/json")) {
      const body = await req.json();
      fromEmail = extractEmail(body.from || "");
      subject = body.subject || "";
      textBody = body.text || "";
      messageId = body.message_id || "";
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

    console.log("[receive-email] Processing from:", fromEmail, "subject:", subject);

    // ── Detect language ──
    const detectedLocale = detectLocale(cleanContent);

    // ── Thread matching ──
    const bookingRef = extractBookingRef(subject);
    let matchedThread: { org_id: string; booking_id?: string; tenant_id?: string; booking_type?: string } | null = null;

    if (bookingRef) {
      const { data } = await supabase.from("chat_messages_v2")
        .select("metadata")
        .eq("metadata->>booking_id", bookingRef).limit(1).maybeSingle();
      if (data?.metadata) {
        const m = data.metadata as Record<string, any>;
        matchedThread = { org_id: m.org_id, booking_id: m.booking_id, tenant_id: m.tenant_id, booking_type: m.booking_type };
        console.log("[receive-email] Matched by REF:", bookingRef);
      }
    }

    if (!matchedThread) {
      const { data } = await supabase.from("chat_messages_v2")
        .select("metadata")
        .eq("metadata->>contact_email", fromEmail)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (data?.metadata) {
        const m = data.metadata as Record<string, any>;
        matchedThread = { org_id: m.org_id, booking_id: m.booking_id, tenant_id: m.tenant_id, booking_type: m.booking_type };
        console.log("[receive-email] Matched by email:", fromEmail);
      }
    }

    if (!matchedThread) {
      const { data } = await supabase.from("tenants")
        .select("id, org_id").eq("email", fromEmail).limit(1).maybeSingle();
      if (data) { matchedThread = { org_id: data.org_id, tenant_id: data.id }; console.log("[receive-email] Matched by tenant:", fromEmail); }
    }

    if (!matchedThread) {
      console.warn("[receive-email] No match for:", fromEmail, subject);
      await supabase.from("audit_logs").insert({
        action: "inbound_email_unmatched",
        metadata_json: { from: fromEmail, subject, body_preview: cleanContent.slice(0, 200), detected_locale: detectedLocale },
      });
      return new Response(JSON.stringify({ status: "unmatched", from: fromEmail, detected_locale: detectedLocale }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Get owner's preferred locale for auto-translation ──
    let ownerLocale = "en";
    const { data: org } = await supabase.from("orgs").select("owner_user_id").eq("id", matchedThread.org_id).single();
    if (org?.owner_user_id) {
      const { data: profile } = await supabase.from("profiles").select("preferred_locale").eq("id", org.owner_user_id).maybeSingle();
      ownerLocale = profile?.preferred_locale || "fr";
    }

    // ── Auto-translate for owner if languages differ ──
    let translatedContent: string | null = null;
    let translatedLocale: string | null = null;
    if (detectedLocale !== ownerLocale) {
      translatedContent = await translateText(cleanContent, detectedLocale, ownerLocale);
      if (translatedContent) translatedLocale = ownerLocale;
    }

    const threadRef = matchedThread.booking_id || matchedThread.tenant_id || matchedThread.org_id;
    const { error: insertErr } = await supabase.from("chat_messages_v2").insert({
      conversation_id: threadRef,
      sender_user_id: null,
      sender_orbit_id: null,
      type: "text",
      body: cleanContent,
      metadata: {
        org_id: matchedThread.org_id,
        tenant_id: matchedThread.tenant_id || null,
        booking_id: matchedThread.booking_id || null,
        booking_type: matchedThread.booking_type || null,
        contact_name: fromEmail.split("@")[0],
        contact_email: fromEmail,
        translated_content: translatedContent,
        translated_locale: translatedLocale,
        language_detected: detectedLocale,
        category: "general",
        message_type: "inbound_email",
        sender_locale: detectedLocale,
        inbound_message_id: messageId || null,
      },
    });

    if (insertErr) {
      console.error("[receive-email] Insert failed:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to save message" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Notify owner ──
    if (org?.owner_user_id) {
      const displayContent = translatedContent || cleanContent;
      await supabase.from("notifications").insert({
        user_id: org.owner_user_id,
        org_id: matchedThread.org_id,
        type: "message",
        title: "📧 Email reply received",
        message: `${fromEmail}: ${displayContent.slice(0, 100)}`,
        link: `/dashboard/messages?thread=${matchedThread.booking_id ? `booking-${matchedThread.booking_id}` : `tenant-${matchedThread.tenant_id}`}`,
        metadata_json: {
          target_type: "message",
          target_id: matchedThread.booking_id || matchedThread.tenant_id || "",
          booking_id: matchedThread.booking_id || "",
          org_id: matchedThread.org_id,
          target_url: `/dashboard/messages?thread=${matchedThread.booking_id ? `booking-${matchedThread.booking_id}` : `tenant-${matchedThread.tenant_id}`}`,
        },
      });
    }

    console.log("[receive-email] ✅ Message inserted. Lang:", detectedLocale, "Translated:", !!translatedContent);

    return new Response(JSON.stringify({
      status: "ok",
      thread: matchedThread.booking_id || matchedThread.tenant_id,
      detected_locale: detectedLocale,
      translated: !!translatedContent,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[receive-email] Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
