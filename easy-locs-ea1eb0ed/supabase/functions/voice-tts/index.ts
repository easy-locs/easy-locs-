import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ElevenLabs not configured" }), {
      status: 503,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const { text, voiceId, modelId } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const voice = voiceId ?? "21m00Tcm4TlvDq8ikWAM";
    const model = modelId ?? "eleven_multilingual_v2";

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: text.slice(0, 5000),
          model_id: model,
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("[voice-tts] ElevenLabs error:", response.status, errText);
      return new Response(JSON.stringify({ error: "TTS generation failed" }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err) {
    console.error("[voice-tts] Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
