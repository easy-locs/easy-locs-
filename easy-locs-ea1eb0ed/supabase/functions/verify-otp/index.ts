import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const MAX_ATTEMPTS = 5;

async function hashOtp(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const envSalt = Deno.env.get("OTP_HASH_SALT");
  if (!envSalt && Deno.env.get("ENVIRONMENT") === "production") {
    throw new Error("OTP_HASH_SALT must be set in production");
  }
  const salt = envSalt || "_easylocs_salt_v1";
  const data = encoder.encode(otp + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function phoneToEmail(phone: string): string {
  return `phone_${phone.replace(/\+/g, "")}@phone.easylocs.internal`;
}

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  try {
    const rlResult = await checkServerRateLimit(req, "verify-otp");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    const { phone, code } = await req.json();

    if (!phone || !code) {
      return jsonResponse({ valid: false, error_code: "MISSING_PARAMS", reason: "phone and code required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: session, error: fetchErr } = await supabase
      .from("phone_otp_sessions")
      .select("id, otp_hash, otp_code, status, attempt_count, attempts, expires_at")
      .eq("phone", phone)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchErr) {
      console.error("[verify-otp] DB fetch error:", fetchErr);
      return jsonResponse({ valid: false, error_code: "DB_ERROR", reason: "Verification service error." }, 500);
    }

    if (!session) {
      return jsonResponse({ valid: false, error_code: "NO_SESSION", reason: "No pending verification session." });
    }

    if (new Date(session.expires_at) < new Date()) {
      await supabase.from("phone_otp_sessions").update({ status: "expired" }).eq("id", session.id);
      return jsonResponse({ valid: false, error_code: "EXPIRED", reason: "Verification code expired." });
    }

    const attempts = session.attempt_count ?? session.attempts ?? 0;
    if (attempts >= MAX_ATTEMPTS) {
      await supabase.from("phone_otp_sessions").update({ status: "blocked" }).eq("id", session.id);
      return jsonResponse({ valid: false, error_code: "BLOCKED", reason: "Too many incorrect attempts." });
    }

    let isValid = false;
    if (session.otp_hash) {
      const codeHash = await hashOtp(code);
      isValid = codeHash === session.otp_hash;
    } else if (session.otp_code) {
      isValid = session.otp_code === code;
    }

    const updateFields: Record<string, unknown> = {
      status: isValid ? "verified" : "pending",
    };
    if (!isValid) {
      if (session.attempt_count !== undefined) updateFields.attempt_count = attempts + 1;
      if (session.attempts !== undefined) updateFields.attempts = attempts + 1;
    }
    if (isValid) updateFields.verified_at = new Date().toISOString();

    await supabase.from("phone_otp_sessions").update(updateFields).eq("id", session.id);

    if (!isValid) {
      return jsonResponse({ valid: false, error_code: "INVALID_CODE", reason: "Incorrect verification code." });
    }

    const syntheticEmail = phoneToEmail(phone);

    let userId: string;
    let isNewUser = false;

    const { data: existingByPhone } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .limit(1)
      .maybeSingle();

    if (existingByPhone) {
      userId = existingByPhone.id;
    } else {
      const { data: existingByEmail } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", syntheticEmail)
        .limit(1)
        .maybeSingle();

      if (existingByEmail) {
        userId = existingByEmail.id;
      } else {
        const { data: createdUser, error: createErr } = await supabase.auth.admin.createUser({
          phone,
          email: syntheticEmail,
          phone_confirm: true,
          email_confirm: true,
          user_metadata: { phone, phone_verified: true },
        });

        if (createErr) {
          if (createErr.message?.includes("already") || createErr.message?.includes("duplicate")) {
            let found = false;
            let page = 1;
            const perPage = 100;
            while (!found && page <= 20) {
              const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers({ page, perPage });
              if (listErr || !users || users.length === 0) break;
              const match = users.find((u) => u.phone === phone || u.email === syntheticEmail);
              if (match) {
                userId = match.id;
                found = true;
              }
              if (users.length < perPage) break;
              page++;
            }
            if (!found) {
              console.error("[verify-otp] User exists but not found via paginated lookup");
              return jsonResponse({ valid: true, userId: null, error_code: "USER_CONFLICT" });
            }
          } else {
            console.error("[verify-otp] Create user error:", createErr);
            return jsonResponse({ valid: false, error_code: "USER_CREATE_FAILED", reason: "Failed to create account." }, 500);
          }
        } else {
          userId = createdUser.user.id;
          isNewUser = true;
        }
      }
    }

    await supabase.auth.admin.updateUserById(userId!, {
      phone,
      phone_confirm: true,
      email: syntheticEmail,
      email_confirm: true,
    });

    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: syntheticEmail,
    });

    if (linkErr || !linkData?.properties?.hashed_token) {
      console.error("[verify-otp] Magic link generation failed:", linkErr?.message);
      return jsonResponse({
        valid: false,
        error_code: "SESSION_CREATE_FAILED",
        reason: "Failed to create login session.",
      }, 500);
    }

    return jsonResponse({
      valid: true,
      userId,
      isNewUser,
      hashed_token: linkData.properties.hashed_token,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[verify-otp] Exception:", message);
    return jsonResponse({ valid: false, error_code: "INTERNAL_ERROR", reason: "Verification service error." }, 500);
  }
});
