import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
    const { tokens, title, body, data } = await req.json();

    if (!Array.isArray(tokens) || !tokens.length || !title) {
      return new Response(JSON.stringify({ error: "tokens[] and title required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DEV: log push payload. In production, call FCM / APNS here.
    console.log("[PUSH]", { tokenCount: tokens.length, title, body, data });

    // Example FCM integration (uncomment when FCM_SERVER_KEY is set):
    // const FCM_KEY = Deno.env.get("FCM_SERVER_KEY");
    // for (const token of tokens) {
    //   await fetch("https://fcm.googleapis.com/fcm/send", {
    //     method: "POST",
    //     headers: {
    //       Authorization: `key=${FCM_KEY}`,
    //       "Content-Type": "application/json",
    //     },
    //     body: JSON.stringify({
    //       to: token,
    //       notification: { title, body: body ?? "" },
    //       data: data ?? {},
    //     }),
    //   });
    // }

    return new Response(JSON.stringify({ success: true, sent: tokens.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("send-push error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
