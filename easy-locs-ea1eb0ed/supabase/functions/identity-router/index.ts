import { EdgeRouter } from "../_shared/edge-function-consolidation.ts";
import { arcjetProtect, arcjetDenyResponse } from "../_shared/arcjet-protection.ts";
import { trackBackendEvent } from "../_shared/segment-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const router = new EdgeRouter("identity-router");

async function proxyToFunction(req: Request, functionName: string): Promise<Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  const resp = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: req.method,
    headers: {
      Authorization: authHeader,
      "Content-Type": req.headers.get("Content-Type") ?? "application/json",
      "x-forwarded-for": req.headers.get("x-forwarded-for") ?? "",
      "cf-connecting-ip": req.headers.get("cf-connecting-ip") ?? "",
    },
    body: req.body,
    // @ts-ignore Deno supports duplex
    duplex: "half",
  });

  const responseHeaders = new Headers(corsHeaders);
  const ct = resp.headers.get("Content-Type");
  if (ct) responseHeaders.set("Content-Type", ct);
  return new Response(resp.body, { status: resp.status, headers: responseHeaders });
}

router.post("/send-otp", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["bot", "shield", "rate-limit"], rateLimitMax: 5 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "send-otp");
});

router.post("/verify-otp", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["bot", "shield", "rate-limit"], rateLimitMax: 5 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "verify-otp");
});

router.post("/webauthn/register/begin", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["bot", "shield"] });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "webauthn-begin-registration");
});

router.post("/webauthn/register/finish", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["bot", "shield"] });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "webauthn-finish-registration");
});

router.post("/webauthn/register/challenge", async (req) => {
  return proxyToFunction(req, "webauthn-registration-challenge");
});

router.post("/webauthn/register/verify", async (req) => {
  return proxyToFunction(req, "webauthn-registration-verify");
});

router.post("/webauthn/auth/challenge", async (req) => {
  return proxyToFunction(req, "webauthn-authentication-challenge");
});

router.post("/webauthn/auth/verify", async (req) => {
  return proxyToFunction(req, "webauthn-authentication-verify");
});

router.post("/webauthn/login/challenge", async (req) => {
  return proxyToFunction(req, "webauthn-login-challenge");
});

router.post("/webauthn/login/verify", async (req) => {
  return proxyToFunction(req, "webauthn-login-verify");
});

router.post("/gdpr/delete", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["shield"] });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  trackBackendEvent("system", "gdpr.deletion_requested");
  return proxyToFunction(req, "gdpr-delete-account");
});

router.post("/gdpr/export", async (req) => {
  return proxyToFunction(req, "gdpr-export");
});

router.post("/gdpr/process-deletion", async (req) => {
  return proxyToFunction(req, "gdpr-deletion-processor");
});

router.post("/kyc-review", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["shield"] });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  trackBackendEvent("system", "kyc.review_completed");
  return proxyToFunction(req, "kyc-review");
});

router.post("/tenant-signup", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["bot", "email", "rate-limit"], rateLimitMax: 10, emailField: "email" });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "tenant-signup");
});

router.post("/guest-session", async (req) => {
  return proxyToFunction(req, "guest-session");
});

router.post("/social-preview", async (req) => {
  return proxyToFunction(req, "social-preview");
});

router.post("/public-api", async (req) => {
  return proxyToFunction(req, "public-api");
});

Deno.serve(router.serve());
