import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { requireAuthenticatedUser } from "../_shared/edge-auth.ts";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { textToSpeech, textToSpeechStream, listVoices, hasElevenLabsKey } from "../_shared/elevenlabs-client.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  try {
    const rlResult = await checkServerRateLimit(req, "tts-engine");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    const authCheck = await requireAuthenticatedUser(req);
    if (!authCheck.authorized) return authCheck.response!;

    if (!hasElevenLabsKey()) {
      return new Response(
        JSON.stringify({ error: "Text-to-speech not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action } = body;

    if (action === "list-voices") {
      const voices = await listVoices();
      return new Response(JSON.stringify({ voices }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, voice_id, model_id, stability, similarity_boost, style, stream } = body;

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (text.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Text too long (max 5000 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ttsOptions = {
      text,
      voiceId: voice_id,
      modelId: model_id,
      stability,
      similarityBoost: similarity_boost,
      style,
    };

    if (stream) {
      const audioStream = await textToSpeechStream(ttsOptions);
      return new Response(audioStream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/mpeg",
          "Transfer-Encoding": "chunked",
        },
      });
    }

    const audioBuffer = await textToSpeech(ttsOptions);
    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.byteLength),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[tts-engine] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
