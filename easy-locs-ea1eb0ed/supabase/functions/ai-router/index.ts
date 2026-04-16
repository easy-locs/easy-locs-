import { EdgeRouter } from "../_shared/edge-function-consolidation.ts";
import { arcjetProtect, arcjetDenyResponse } from "../_shared/arcjet-protection.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const router = new EdgeRouter("ai-router");

async function proxyToFunction(req: Request, functionName: string): Promise<Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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
  const contentType = resp.headers.get("Content-Type");
  if (contentType) responseHeaders.set("Content-Type", contentType);
  const aiProvider = resp.headers.get("X-AI-Provider");
  if (aiProvider) responseHeaders.set("X-AI-Provider", aiProvider);

  return new Response(resp.body, { status: resp.status, headers: responseHeaders });
}

router.post("/assistant", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["bot", "rate-limit"], rateLimitMax: 60 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "ai-assistant");
});

router.post("/shopping-chat", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["bot", "rate-limit"], rateLimitMax: 60 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "ai-shopping-chat");
});

router.post("/entity-enrichment", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["bot", "shield"], rateLimitMax: 30 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "ai-entity-enrichment");
});

router.post("/web-search", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["bot", "rate-limit"], rateLimitMax: 30 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "ai-web-search");
});

router.post("/ops-chat", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["bot", "shield"], rateLimitMax: 20 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "ops-ai-chat");
});

router.post("/classify", async (req) => {
  return proxyToFunction(req, "classify-business");
});

router.post("/generate-seo", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["bot", "rate-limit"], rateLimitMax: 30 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "generate-seo");
});

router.post("/generate-cv", async (req) => {
  return proxyToFunction(req, "generate-cv");
});

router.post("/extract-article", async (req) => {
  return proxyToFunction(req, "extract-article");
});

router.post("/storefront-description", async (req) => {
  return proxyToFunction(req, "storefront-description");
});

router.post("/translate", async (req) => {
  return proxyToFunction(req, "translate-message");
});

Deno.serve(router.serve());
