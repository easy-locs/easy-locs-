import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireAuthenticatedUser } from "../_shared/edge-auth.ts";
import { encode as base64url } from "https://deno.land/std@0.190.0/encoding/base64url.ts";
import { getExpectedRpId } from "../_shared/webauthn-crypto.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  try {
    const auth = await requireAuthenticatedUser(req);
    if (!auth.authorized || !auth.userId) return auth.response!;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: credentials } = await supabase
      .from("webauthn_credentials")
      .select("credential_id, transports")
      .eq("user_id", auth.userId);

    if (!credentials || credentials.length === 0) {
      return new Response(
        JSON.stringify({ error: "No biometric credentials registered" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const challengeB64 = base64url(challenge);

    await supabase.from("webauthn_challenges").insert({
      user_id: auth.userId,
      challenge: challengeB64,
      type: "authentication",
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });

    const rpId = getExpectedRpId();

    const options = {
      challenge: challengeB64,
      rpId,
      timeout: 60000,
      userVerification: "required",
      allowCredentials: credentials.map((c: { credential_id: string; transports: string[] }) => ({
        id: c.credential_id,
        type: "public-key",
        transports: c.transports || ["internal"],
      })),
    };

    return new Response(JSON.stringify({ options }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("webauthn-authentication-challenge error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
