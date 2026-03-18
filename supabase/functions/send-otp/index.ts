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
    const { phone, otp } = await req.json();

    if (!phone || !otp) {
      return new Response(JSON.stringify({ error: "phone and otp required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── DEV MODE: log OTP to console ──
    // In production, integrate Twilio / MessageBird / local SMS aggregator here
    console.log(`[OTP] Sending ${otp} to ${phone}`);

    // Example Twilio integration (uncomment when TWILIO secrets are set):
    // const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    // const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    // const TWILIO_FROM = Deno.env.get("TWILIO_PHONE_NUMBER");
    //
    // const twilioRes = await fetch(
    //   `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
    //   {
    //     method: "POST",
    //     headers: {
    //       Authorization: `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}`,
    //       "Content-Type": "application/x-www-form-urlencoded",
    //     },
    //     body: new URLSearchParams({
    //       To: phone,
    //       From: TWILIO_FROM!,
    //       Body: `Your verification code is: ${otp}`,
    //     }),
    //   }
    // );
    // if (!twilioRes.ok) {
    //   const err = await twilioRes.text();
    //   throw new Error(`Twilio error: ${err}`);
    // }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("send-otp error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
