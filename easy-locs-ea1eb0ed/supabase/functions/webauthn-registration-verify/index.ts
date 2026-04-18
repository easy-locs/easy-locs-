import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireAuthenticatedUser } from "../_shared/edge-auth.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";
import {
  parseAttestationObject,
  verifyRpIdHash,
  getExpectedOrigin,
  getExpectedRpId,
} from "../_shared/webauthn-crypto.ts";

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

    const { credential, deviceName } = await req.json();

    if (!credential?.id || !credential?.response?.clientDataJSON || !credential?.response?.attestationObject) {
      return new Response(
        JSON.stringify({ error: "Invalid credential payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: challengeRow, error: challengeErr } = await supabase
      .from("webauthn_challenges")
      .select("*")
      .eq("user_id", auth.userId)
      .eq("type", "registration")
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (challengeErr || !challengeRow) {
      return new Response(
        JSON.stringify({ error: "No valid challenge found. Please retry." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase
      .from("webauthn_challenges")
      .update({ used: true })
      .eq("id", challengeRow.id);

    const clientDataRaw = atob(credential.response.clientDataJSON);
    const clientData = JSON.parse(clientDataRaw);

    if (clientData.type !== "webauthn.create") {
      return new Response(
        JSON.stringify({ error: "Invalid client data type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const expectedOrigin = getExpectedOrigin();
    if (clientData.origin !== expectedOrigin) {
      return new Response(
        JSON.stringify({ error: "Origin mismatch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const receivedChallenge = (clientData.challenge || "").replace(/=+$/, "");
    const storedChallenge = (challengeRow.challenge || "").replace(/=+$/, "");
    if (receivedChallenge !== storedChallenge) {
      return new Response(
        JSON.stringify({ error: "Challenge mismatch — possible replay attack" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = parseAttestationObject(credential.response.attestationObject);

    if (!(parsed.flags & 0x01)) {
      return new Response(
        JSON.stringify({ error: "User presence flag not set" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!(parsed.flags & 0x04)) {
      return new Response(
        JSON.stringify({ error: "User verification not confirmed — biometric or PIN required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rpIdValid = await verifyRpIdHash(parsed.rpIdHash, getExpectedRpId());
    if (!rpIdValid) {
      return new Response(
        JSON.stringify({ error: "RP ID hash mismatch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: insertErr } = await supabase
      .from("webauthn_credentials")
      .insert({
        user_id: auth.userId,
        credential_id: credential.id,
        public_key: JSON.stringify({
          jwk: parsed.publicKeyJwk,
          alg: parsed.publicKeyAlg,
        }),
        sign_count: parsed.signCount,
        device_name: deviceName || "Biometric Device",
        transports: credential.response.transports || ["internal"],
      });

    if (insertErr) {
      if (insertErr.code === "23505") {
        return new Response(
          JSON.stringify({ error: "This credential is already registered" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw insertErr;
    }

    await supabase
      .from("profiles")
      .update({ biometric_enabled: true })
      .eq("id", auth.userId);

    return new Response(
      JSON.stringify({ success: true, credentialId: credential.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("webauthn-registration-verify error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
