import { EdgeRouter } from "../_shared/edge-function-consolidation.ts";
import { arcjetProtect, arcjetDenyResponse } from "../_shared/arcjet-protection.ts";
import { trackBackendEvent } from "../_shared/segment-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const router = new EdgeRouter("wallet-router");

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

router.post("/ops", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["shield", "rate-limit"], rateLimitMax: 10 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "wallet-ops");
});

router.post("/pin", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["bot", "shield", "rate-limit"], rateLimitMax: 5 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "wallet-pin");
});

router.post("/transfer", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["bot", "shield", "rate-limit"], rateLimitMax: 10 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  trackBackendEvent("system", "wallet.transfer_initiated");
  return proxyToFunction(req, "wallet-transfer");
});

router.post("/topup", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["shield", "rate-limit"], rateLimitMax: 10 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  trackBackendEvent("system", "wallet.topup_initiated");
  return proxyToFunction(req, "create-wallet-topup");
});

Deno.serve(router.serve());
