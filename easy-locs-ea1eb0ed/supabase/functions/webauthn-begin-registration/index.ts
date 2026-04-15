/**
 * webauthn-begin-registration — Generate registration options with a server-issued challenge.
 * Caller must provide a valid Supabase JWT via Authorization header.
 * Returns PublicKeyCredentialCreationOptionsJSON (serialisable registration options).
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { generateRegistrationOptions } from "npm:@simplewebauthn/server@9.0.3";
import { getCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const CHALLENGE_TTL_SECONDS = 120;

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
    const userEmail = userData.user.email ?? userId;

    const siteUrl = Deno.env.get("SITE_URL") ?? "";
    const rpId = siteUrl ? new URL(siteUrl).hostname : "localhost";
    const rpName = "Easy-Locs Wallet";

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Purge expired challenges for this user
    await supabase.from("webauthn_challenges").delete()
      .eq("user_id", userId)
      .lt("expires_at", new Date().toISOString());

    // 2. Generate registration options (challenge is auto-generated and base64url-encoded)
    const options = await generateRegistrationOptions({
      rpName,
      rpID: rpId,
      userID: new TextEncoder().encode(userId),
      userName: userEmail,
      userDisplayName: userEmail,
      attestationType: "none",
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "discouraged",
      },
      timeout: 60000,
    });

    // 3. Store the challenge server-side
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_SECONDS * 1000).toISOString();
    const { error: insertErr } = await supabase.from("webauthn_challenges").insert({
      user_id: userId,
      challenge: options.challenge,
      action: "registration",
      expires_at: expiresAt,
    });
    if (insertErr) throw insertErr;

    return json({ options, user_id: userId });
  } catch (err) {
    console.error("[webauthn-begin-registration]", err);
    return json({ error: String(err) }, 500);
  }
});
