import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_MESSAGES_PER_SESSION = 20;
const MAX_MEDIA_PER_SESSION = 5;
const MAX_SESSIONS_PER_FINGERPRINT = 5;
const SESSION_DURATION_HOURS = 2;

/** Auto-translate via the translate-message function */
async function autoTranslate(
  supabaseUrl: string,
  anonKey: string,
  text: string,
  fromLocale: string,
  toLocale: string,
): Promise<string | null> {
  if (!text.trim() || fromLocale === toLocale) return null;
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/translate-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: anonKey },
      body: JSON.stringify({ text, from_locale: fromLocale, to_locale: toLocale }),
    });
    if (!res.ok) { await res.text(); return null; }
    const data = await res.json();
    return data.translated || null;
  } catch { return null; }
}

/** Validate a guest session, returns session data or null */
async function validateSession(supabase: any, token: string) {
  const { data } = await supabase
    .from("guest_sessions")
    .select("*")
    .eq("token", token)
    .single();
  if (!data || data.blocked || new Date(data.expires_at) < new Date()) return null;
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json();
    const { action } = body;

    // ─── CREATE SESSION ───
    if (action === "create") {
      const { display_name, email, fingerprint, org_id, context_type, context_id } = body;

      if (!org_id) throw new Error("org_id required");
      if (!display_name || display_name.length > 100) throw new Error("Invalid display_name");
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email");

      if (fingerprint) {
        const { count } = await supabase
          .from("guest_sessions")
          .select("id", { count: "exact", head: true })
          .eq("fingerprint", fingerprint)
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        if ((count || 0) >= MAX_SESSIONS_PER_FINGERPRINT) {
          return new Response(JSON.stringify({ error: "Too many sessions. Please try again later." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const { data, error } = await supabase.from("guest_sessions").insert({
        display_name: display_name.trim().slice(0, 100),
        email: email?.trim().toLowerCase(),
        fingerprint,
        org_id,
        context_type: context_type || "general",
        context_id,
        expires_at: new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000).toISOString(),
      }).select("id, token, expires_at").single();

      if (error) throw error;

      return new Response(JSON.stringify({ session: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── VALIDATE SESSION ───
    if (action === "validate") {
      const { token } = body;
      if (!token) throw new Error("token required");

      const { data, error } = await supabase
        .from("guest_sessions")
        .select("id, display_name, email, org_id, context_type, context_id, expires_at, messages_sent, media_sent, blocked")
        .eq("token", token)
        .single();

      if (error || !data) {
        return new Response(JSON.stringify({ valid: false, error: "Session not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (data.blocked) {
        return new Response(JSON.stringify({ valid: false, error: "Session blocked" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (new Date(data.expires_at) < new Date()) {
        return new Response(JSON.stringify({ valid: false, error: "Session expired" }), {
          status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("guest_sessions").update({ last_activity_at: new Date().toISOString() }).eq("id", data.id);

      return new Response(JSON.stringify({
        valid: true,
        session: data,
        limits: {
          messages_remaining: MAX_MESSAGES_PER_SESSION - data.messages_sent,
          media_remaining: MAX_MEDIA_PER_SESSION - data.media_sent,
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── SEND MESSAGE ───
    if (action === "send_message") {
      const { token, content, attachment_urls, guest_locale } = body;
      if (!token) throw new Error("token required");

      const session = await validateSession(supabase, token);
      if (!session) {
        return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const hasMedia = attachment_urls && attachment_urls.length > 0;
      if (session.messages_sent >= MAX_MESSAGES_PER_SESSION) {
        return new Response(JSON.stringify({ error: "Message limit reached" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (hasMedia && session.media_sent >= MAX_MEDIA_PER_SESSION) {
        return new Response(JSON.stringify({ error: "Media limit reached" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!content?.trim() && !hasMedia) throw new Error("Empty message");
      if (content && content.length > 2000) throw new Error("Message too long");

      let translatedContent: string | null = null;
      const detectedLocale = guest_locale || "en";

      const { data: org } = await supabase
        .from("orgs").select("owner_user_id").eq("id", session.org_id).single();

      let sellerLocale = "en";
      if (org?.owner_user_id) {
        const { data: profile } = await supabase
          .from("profiles").select("language").eq("id", org.owner_user_id).maybeSingle();
        sellerLocale = (profile as any)?.language || "en";
      }

      if (content?.trim() && detectedLocale !== sellerLocale) {
        translatedContent = await autoTranslate(supabaseUrl, anonKey, content.trim(), detectedLocale, sellerLocale);
      }

      const { data: msg, error: msgErr } = await supabase.from("messages").insert({
        org_id: session.org_id,
        sender_id: null,
        guest_session_id: session.id,
        content: content?.trim() || "",
        translated_content: translatedContent,
        language_detected: detectedLocale,
        translated_locale: translatedContent ? sellerLocale : null,
        contact_name: session.display_name,
        contact_email: session.email,
        category: "general",
        message_type: "incoming",
        context_id: session.context_id,
        attachment_urls: hasMedia ? attachment_urls : [],
        read: false,
      }).select("id, created_at").single();

      if (msgErr) throw msgErr;

      await supabase.from("guest_sessions").update({
        messages_sent: session.messages_sent + 1,
        media_sent: session.media_sent + (hasMedia ? attachment_urls.length : 0),
        last_activity_at: new Date().toISOString(),
      }).eq("id", session.id);

      if (org?.owner_user_id) {
        let contextLabel = "";
        if (session.context_type === "service" && session.context_id) {
          const { data: svc } = await supabase
            .from("concierge_services").select("title").eq("id", session.context_id).maybeSingle();
          if (!svc) {
            const { data: mSvc } = await supabase
              .from("marketplace_services").select("title").eq("id", session.context_id).maybeSingle();
            contextLabel = (mSvc as any)?.title || "";
          } else {
            contextLabel = svc.title;
          }
        } else if (session.context_type === "listing" && session.context_id) {
          const { data: listing } = await supabase
            .from("public_listings").select("title").eq("id", session.context_id).maybeSingle();
          contextLabel = (listing as any)?.title || "";
        }

        await supabase.from("notifications").insert({
          user_id: org.owner_user_id,
          org_id: session.org_id,
          type: "info",
          title: "💬 New guest message",
          message: `${session.display_name}: ${(translatedContent || content || "").slice(0, 100)}${contextLabel ? ` — ${contextLabel}` : ""}`,
          link: `/dashboard/communication?thread=guest-${session.id}`,
          metadata_json: {
            target_type: "guest_message",
            target_id: msg.id,
            guest_session_id: session.id,
            context_type: session.context_type,
            context_id: session.context_id,
            context_label: contextLabel,
            guest_locale: detectedLocale,
          },
        });
      }

      return new Response(JSON.stringify({ success: true, message_id: msg.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── GET MESSAGES ───
    if (action === "get_messages") {
      const { token, guest_locale } = body;
      if (!token) throw new Error("token required");

      const session = await validateSession(supabase, token);
      if (!session) {
        return new Response(JSON.stringify({ messages: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: messages } = await supabase
        .from("messages")
        .select("id, content, translated_content, language_detected, translated_locale, created_at, sender_id, attachment_urls, contact_name")
        .eq("org_id", session.org_id)
        .or(`guest_session_id.eq.${session.id},context_id.eq.guest_${session.id}`)
        .order("created_at", { ascending: true })
        .limit(100);

      const enriched = await Promise.all((messages || []).map(async (m: any) => {
        const isFromHost = !!m.sender_id;
        let translatedForGuest = m.translated_content;

        if (isFromHost && guest_locale && m.content && !translatedForGuest) {
          const hostLang = m.language_detected || "en";
          if (hostLang !== guest_locale) {
            translatedForGuest = await autoTranslate(supabaseUrl, anonKey, m.content, hostLang, guest_locale);
          }
        }

        return {
          id: m.id,
          content: m.content,
          translated_content: isFromHost ? translatedForGuest : m.translated_content,
          created_at: m.created_at,
          is_from_host: isFromHost,
          attachment_urls: m.attachment_urls,
          contact_name: m.contact_name,
        };
      }));

      return new Response(JSON.stringify({ messages: enriched }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── CALL REQUEST (guest initiates) ───
    if (action === "call_request") {
      const { token, is_video } = body;
      if (!token) throw new Error("token required");

      const session = await validateSession(supabase, token);
      if (!session) {
        return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const callId = crypto.randomUUID();

      // Resolve context label
      let contextLabel = "";
      if (session.context_type === "service" && session.context_id) {
        const { data: svc } = await supabase
          .from("concierge_services").select("title").eq("id", session.context_id).maybeSingle();
        if (!svc) {
          const { data: mSvc } = await supabase
            .from("marketplace_services").select("title").eq("id", session.context_id).maybeSingle();
          contextLabel = (mSvc as any)?.title || "";
        } else {
          contextLabel = svc.title;
        }
      } else if (session.context_type === "listing" && session.context_id) {
        const { data: listing } = await supabase
          .from("public_listings").select("title").eq("id", session.context_id).maybeSingle();
        contextLabel = (listing as any)?.title || "";
      }

      // Insert call request signal
      const { error } = await supabase.from("guest_call_signals").insert({
        call_id: callId,
        guest_session_id: session.id,
        org_id: session.org_id,
        status: "ringing",
        is_video: !!is_video,
        context_type: session.context_type,
        context_id: session.context_id,
        context_label: contextLabel,
        guest_name: session.display_name,
        signal_type: "call_request",
        signal_data: JSON.stringify({ is_video: !!is_video }),
        from_role: "caller",
      });

      if (error) throw error;

      // Notify org owner
      const { data: org } = await supabase
        .from("orgs").select("owner_user_id").eq("id", session.org_id).single();

      if (org?.owner_user_id) {
        await supabase.from("notifications").insert({
          user_id: org.owner_user_id,
          org_id: session.org_id,
          type: "info",
          title: `📞 Incoming ${is_video ? "video" : "audio"} call`,
          message: `${session.display_name} is calling${contextLabel ? ` — ${contextLabel}` : ""}`,
          link: `/dashboard/communication?call=${callId}`,
          metadata_json: {
            target_type: "guest_call",
            call_id: callId,
            guest_session_id: session.id,
            guest_name: session.display_name,
            is_video: !!is_video,
            context_label: contextLabel,
          },
        });
      }

      return new Response(JSON.stringify({ call_id: callId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── CALL SIGNAL (SDP/ICE exchange) ───
    if (action === "call_signal") {
      const { call_id, signal_type, signal_data, from_role, token: guestToken, auth_token } = body;
      if (!call_id || !signal_type) throw new Error("call_id and signal_type required");

      // Verify caller identity
      if (guestToken) {
        const session = await validateSession(supabase, guestToken);
        if (!session) {
          return new Response(JSON.stringify({ error: "Invalid session" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Get the call's org_id from existing signals
      const { data: existing } = await supabase
        .from("guest_call_signals")
        .select("org_id, guest_session_id")
        .eq("call_id", call_id)
        .limit(1)
        .single();

      if (!existing) throw new Error("Call not found");

      // Update status for declined/ended
      if (signal_type === "declined" || signal_type === "ended") {
        await supabase.from("guest_call_signals")
          .update({ status: signal_type })
          .eq("call_id", call_id)
          .eq("signal_type", "call_request");
      }

      // Insert signal
      await supabase.from("guest_call_signals").insert({
        call_id,
        guest_session_id: existing.guest_session_id,
        org_id: existing.org_id,
        signal_type,
        signal_data: signal_data || "{}",
        from_role: from_role || "unknown",
        status: signal_type === "declined" ? "declined" : signal_type === "ended" ? "ended" : "active",
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── CALL POLL (get new signals) ───
    if (action === "call_poll") {
      const { call_id, role, token: guestToken } = body;
      if (!call_id || !role) throw new Error("call_id and role required");

      // Get unprocessed signals for the other role
      const processedField = role === "caller" ? "processed_by_caller" : "processed_by_callee";
      const otherRole = role === "caller" ? "callee" : "caller";

      const { data: signals } = await supabase
        .from("guest_call_signals")
        .select("id, signal_type, signal_data, from_role, status")
        .eq("call_id", call_id)
        .eq(processedField, false)
        .eq("from_role", otherRole)
        .order("created_at", { ascending: true })
        .limit(50);

      // Mark as processed
      if (signals && signals.length > 0) {
        const ids = signals.map((s: any) => s.id);
        await supabase.from("guest_call_signals")
          .update({ [processedField]: true })
          .in("id", ids);
      }

      // Check overall call status
      const { data: callStatus } = await supabase
        .from("guest_call_signals")
        .select("status")
        .eq("call_id", call_id)
        .eq("signal_type", "call_request")
        .single();

      return new Response(JSON.stringify({
        signals: signals || [],
        call_status: callStatus?.status || "ringing",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action");
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
