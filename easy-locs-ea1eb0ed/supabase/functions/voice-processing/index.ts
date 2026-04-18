import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { requireAuthenticatedUser } from "../_shared/edge-auth.ts";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { transcribeAudio, transcribeUrl, hasDeepgramKey } from "../_shared/deepgram-client.ts";
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
    const rlResult = await checkServerRateLimit(req, "voice-processing");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    const authCheck = await requireAuthenticatedUser(req);
    if (!authCheck.authorized) return authCheck.response!;

    if (!hasDeepgramKey()) {
      return new Response(
        JSON.stringify({ error: "Voice processing not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      const { audio_url, language, model, diarize, utterances } = body;

      if (!audio_url) {
        return new Response(
          JSON.stringify({ error: "audio_url is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await transcribeUrl(audio_url, {
        language: language ?? "en",
        model: model ?? "nova-2",
        diarize: diarize ?? false,
        utterances: utterances ?? false,
      });

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (
      contentType.includes("audio/") ||
      contentType.includes("video/") ||
      contentType.includes("application/octet-stream") ||
      contentType.includes("multipart/form-data")
    ) {
      const audioData = await req.arrayBuffer();

      if (audioData.byteLength === 0) {
        return new Response(
          JSON.stringify({ error: "Empty audio data" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (audioData.byteLength > 25 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: "Audio file too large (max 25MB)" }),
          { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const language = new URL(req.url).searchParams.get("language") ?? "en";
      const model = new URL(req.url).searchParams.get("model") ?? "nova-2";

      const result = await transcribeAudio(audioData, contentType, {
        language,
        model,
        punctuate: true,
        smart_format: true,
      });

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Unsupported content type. Send JSON with audio_url or raw audio data." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[voice-processing] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
