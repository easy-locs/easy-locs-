import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limits
const MAX_MESSAGES_PER_SESSION = 20;
const MAX_MEDIA_PER_SESSION = 5;
const MAX_SESSIONS_PER_FINGERPRINT = 5; // per 24h
const SESSION_DURATION_HOURS = 2;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { display_name, email, fingerprint, org_id, context_type, context_id } = body;

      // Validate required fields
      if (!org_id) throw new Error("org_id required");
      if (!display_name || display_name.length > 100) throw new Error("Invalid display_name");
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email");

      // Abuse detection: check fingerprint rate
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

      // Update last activity
      await supabase.from("guest_sessions")
        .update({ last_activity_at: new Date().toISOString() })
        .eq("id", data.id);

      return new Response(JSON.stringify({
        valid: true,
        session: data,
        limits: {
          messages_remaining: MAX_MESSAGES_PER_SESSION - data.messages_sent,
          media_remaining: MAX_MEDIA_PER_SESSION - data.media_sent,
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "send_message") {
      const { token, content, attachment_urls } = body;
      if (!token) throw new Error("token required");

      // Validate session
      const { data: session } = await supabase
        .from("guest_sessions")
        .select("*")
        .eq("token", token)
        .single();

      if (!session || session.blocked || new Date(session.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Rate limit check
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

      // Content validation
      if (!content?.trim() && !hasMedia) throw new Error("Empty message");
      if (content && content.length > 2000) throw new Error("Message too long");

      // Insert message
      const { data: msg, error: msgErr } = await supabase.from("messages").insert({
        org_id: session.org_id,
        sender_id: null,
        guest_session_id: session.id,
        content: content?.trim() || "",
        contact_name: session.display_name,
        contact_email: session.email,
        category: "general",
        message_type: "incoming",
        context_id: session.context_id,
        attachment_urls: hasMedia ? attachment_urls : [],
        read: false,
      }).select("id, created_at").single();

      if (msgErr) throw msgErr;

      // Update counters
      await supabase.from("guest_sessions").update({
        messages_sent: session.messages_sent + 1,
        media_sent: session.media_sent + (hasMedia ? attachment_urls.length : 0),
        last_activity_at: new Date().toISOString(),
      }).eq("id", session.id);

      // Notify org owner
      const { data: org } = await supabase
        .from("orgs").select("owner_user_id").eq("id", session.org_id).single();

      if (org?.owner_user_id) {
        await supabase.from("notifications").insert({
          user_id: org.owner_user_id,
          org_id: session.org_id,
          type: "info",
          title: "💬 New guest message",
          message: `${session.display_name} sent a message${session.context_type !== "general" ? ` about ${session.context_type}` : ""}`,
          link: "/dashboard/communication",
          metadata_json: {
            target_type: "guest_message",
            target_id: msg.id,
            guest_session_id: session.id,
            context_type: session.context_type,
            context_id: session.context_id,
          },
        });
      }

      return new Response(JSON.stringify({ success: true, message_id: msg.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_messages") {
      const { token } = body;
      if (!token) throw new Error("token required");

      const { data: session } = await supabase
        .from("guest_sessions")
        .select("id, org_id, context_id, expires_at, blocked")
        .eq("token", token)
        .single();

      if (!session || session.blocked || new Date(session.expires_at) < new Date()) {
        return new Response(JSON.stringify({ messages: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get messages for this guest session + replies from org
      const { data: messages } = await supabase
        .from("messages")
        .select("id, content, created_at, sender_id, attachment_urls, contact_name")
        .eq("org_id", session.org_id)
        .or(`guest_session_id.eq.${session.id},context_id.eq.guest_${session.id}`)
        .order("created_at", { ascending: true })
        .limit(100);

      return new Response(JSON.stringify({
        messages: (messages || []).map(m => ({
          ...m,
          is_from_host: !!m.sender_id,
        })),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error("Unknown action");
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
