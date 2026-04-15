/**
 * webauthn-finish-registration — Verify attestation response using @simplewebauthn/server.
 * Caller must provide a valid Supabase JWT via Authorization header.
 * Action: POST { registrationResponse: PublicKeyCredentialCreationOptionsJSON, device_name? }
 * Returns: { success: true, credential_id }
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { verifyRegistrationResponse } from "npm:@simplewebauthn/server@9.0.3";
import type { RegistrationResponseJSON } from "npm:@simplewebauthn/types@9.0.1";
import { getCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    // 1. Authenticate caller — derive user_id from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(SUPABASE_URL, ANON_KEY);
    const { data: userData, error: userErr } = await anonClient.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: "Invalid or expired JWT" }, 401);

    const userId = userData.user.id;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const body = await req.json();
    const registrationResponse: RegistrationResponseJSON = body.registrationResponse;
    const device_name: string | undefined = typeof body.device_name === "string"
      ? body.device_name.slice(0, 200)
      : undefined;

    if (!registrationResponse) {
      return json({ error: "Missing registrationResponse" }, 400);
    }

    // 2. Retrieve the server-issued challenge (must be unexpired, action=registration)
    const { data: challenges, error: challengeErr } = await supabase
      .from("webauthn_challenges")
      .select("id, challenge, expires_at")
      .eq("user_id", userId)
      .eq("action", "registration")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (challengeErr || !challenges?.length) {
      return json({ error: "No valid challenge found — begin registration first" }, 400);
    }

    const storedChallenge = challenges[0];

    const siteUrl = Deno.env.get("SITE_URL");
    if (!siteUrl) {
      console.error("[webauthn-finish-registration] SITE_URL env var is not configured — failing closed to prevent origin bypass");
      return json({ error: "Server misconfiguration: SITE_URL is not set" }, 500);
    }
    const expectedOrigin = siteUrl;
    const expectedRPID = new URL(siteUrl).hostname;

    // 3. Verify using @simplewebauthn/server — full standards-compliant verification:
    //    - CBOR-parsed authenticatorData (not byte scanning)
    //    - Challenge binding (server challenge matches client response)
    //    - Origin verification
    //    - RP ID hash verification (SHA-256(rpId) vs authenticatorData[0:32])
    //    - User presence and user verification flags
    //    - Attestation statement verification (for "none" format: verifies stmt is empty)
    //    - Credential ID consistency
    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: registrationResponse,
        expectedChallenge: storedChallenge.challenge,
        expectedOrigin,
        expectedRPID,
        requireUserVerification: true,
      });
    } catch (verifyErr) {
      console.error("[webauthn-finish-registration] verification failed", verifyErr);
      return json({ error: `WebAuthn verification failed: ${String(verifyErr)}` }, 400);
    }

    if (!verification.verified || !verification.registrationInfo) {
      return json({ error: "Registration response did not pass verification" }, 400);
    }

    const { registrationInfo } = verification;

    // 4. Delete the challenge immediately after successful use (one-time use)
    await supabase.from("webauthn_challenges").delete().eq("id", storedChallenge.id);

    // 5. Store the verified credential
    const { error: credErr } = await supabase.from("webauthn_credentials").upsert({
      user_id: userId,
      credential_id: registrationInfo.credentialID,
      public_key_cose: Buffer.from(registrationInfo.credentialPublicKey).toString("base64"),
      sign_count: registrationInfo.counter,
      aaguid: registrationInfo.aaguid ?? null,
      device_name: device_name ?? null,
      last_used_at: new Date().toISOString(),
    }, { onConflict: "credential_id" });

    if (credErr) throw credErr;

    // 6. Set biometric_enabled — strictly gated on successful @simplewebauthn verification
    const { error: profileErr } = await supabase.from("profiles")
      .update({ biometric_enabled: true })
      .eq("id", userId);

    if (profileErr) throw profileErr;

    return json({ success: true, credential_id: registrationInfo.credentialID });
  } catch (err) {
    console.error("[webauthn-finish-registration]", err);
    return json({ error: "Internal error during WebAuthn verification" }, 500);
  }
});
