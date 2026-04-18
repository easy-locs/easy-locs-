import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";
import {
  parseAuthenticatorData,
  verifyRpIdHash,
  verifyAssertionSignature,
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
    const { credential, userId } = await req.json();

    if (!userId || !credential?.id || !credential?.response?.clientDataJSON ||
        !credential?.response?.authenticatorData || !credential?.response?.signature) {
      return new Response(
        JSON.stringify({ error: "Invalid login verification payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: challengeRow, error: challengeErr } = await supabase
      .from("webauthn_challenges")
      .select("*")
      .eq("user_id", userId)
      .eq("type", "authentication")
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

    const { data: storedCred, error: credErr } = await supabase
      .from("webauthn_credentials")
      .select("*")
      .eq("credential_id", credential.id)
      .eq("user_id", userId)
      .single();

    if (credErr || !storedCred) {
      return new Response(
        JSON.stringify({ error: "Credential not found for this account" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientDataRaw = atob(credential.response.clientDataJSON);
    const clientData = JSON.parse(clientDataRaw);

    if (clientData.type !== "webauthn.get") {
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
        JSON.stringify({ error: "Challenge mismatch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authDataParsed = parseAuthenticatorData(credential.response.authenticatorData);

    const rpIdValid = await verifyRpIdHash(authDataParsed.rpIdHash, getExpectedRpId());
    if (!rpIdValid) {
      return new Response(
        JSON.stringify({ error: "RP ID hash mismatch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!authDataParsed.userPresent) {
      return new Response(
        JSON.stringify({ error: "User presence not confirmed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!authDataParsed.userVerified) {
      return new Response(
        JSON.stringify({ error: "User verification not confirmed — biometric or PIN required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let storedKeyData: { jwk: JsonWebKey; alg: number };
    try {
      storedKeyData = JSON.parse(storedCred.public_key);
    } catch {
      return new Response(
        JSON.stringify({ error: "Stored credential key is corrupted" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const signatureValid = await verifyAssertionSignature(
      credential.response.authenticatorData,
      credential.response.clientDataJSON,
      credential.response.signature,
      storedKeyData.jwk,
      storedKeyData.alg
    );

    if (!signatureValid) {
      return new Response(
        JSON.stringify({ error: "Signature verification failed" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (
      storedCred.sign_count > 0 &&
      authDataParsed.signCount > 0 &&
      authDataParsed.signCount <= storedCred.sign_count
    ) {
      return new Response(
        JSON.stringify({ error: "Credential counter regression — possible cloning" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase
      .from("webauthn_credentials")
      .update({
        sign_count: authDataParsed.signCount,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", storedCred.id);

    const { data: authData, error: authErr } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: (await supabase.from("profiles").select("email").eq("id", userId).single()).data?.email || "",
    });

    if (authErr || !authData) {
      return new Response(
        JSON.stringify({
          success: true,
          verified: true,
          loginMethod: "manual",
          userId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        loginMethod: "auto",
        userId,
        actionLink: authData.properties?.action_link,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("webauthn-login-verify error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
