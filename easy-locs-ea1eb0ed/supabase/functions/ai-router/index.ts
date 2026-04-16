import { EdgeRouter, proxyToFunction } from "../_shared/edge-function-consolidation.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { arcjetProtect, arcjetDenyResponse } from "../_shared/arcjet-protection.ts";

const router = new EdgeRouter("ai-router", { requireAuth: true, tierAwareRateLimit: true });

router.post("/assistant", async (req) => {
  const cors = getCorsHeaders(req);
  const arcjet = await arcjetProtect(req, { modes: ["bot", "rate-limit"], rateLimitMax: 60 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "ai-assistant", cors);
});

router.post("/shopping-chat", async (req) => {
  const cors = getCorsHeaders(req);
  const arcjet = await arcjetProtect(req, { modes: ["bot", "rate-limit"], rateLimitMax: 60 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "ai-shopping-chat", cors);
});

router.post("/entity-enrichment", async (req) => {
  const cors = getCorsHeaders(req);
  const arcjet = await arcjetProtect(req, { modes: ["bot", "shield"], rateLimitMax: 30 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "ai-entity-enrichment", cors);
});

router.post("/web-search", async (req) => {
  const cors = getCorsHeaders(req);
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Valid Bearer token required" }), {
      status: 401, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  const arcjet = await arcjetProtect(req, { modes: ["bot", "rate-limit"], rateLimitMax: 30 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "ai-web-search", cors);
});

router.post("/ops-chat", async (req) => {
  const cors = getCorsHeaders(req);
  const arcjet = await arcjetProtect(req, { modes: ["bot", "shield"], rateLimitMax: 20 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "ops-ai-chat", cors);
});

router.post("/classify", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "classify-business", cors);
});

router.post("/generate-seo", async (req) => {
  const cors = getCorsHeaders(req);
  const arcjet = await arcjetProtect(req, { modes: ["bot", "rate-limit"], rateLimitMax: 30 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "generate-seo", cors);
});

router.post("/generate-cv", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "generate-cv", cors);
});

router.post("/extract-article", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "extract-article", cors);
});

router.post("/storefront-description", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "storefront-description", cors);
});

router.post("/translate", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "translate-message", cors);
});

router.post("/proxy", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "ai-proxy", cors);
});

router.post("/rag", async (req) => {
  const cors = getCorsHeaders(req);
  const arcjet = await arcjetProtect(req, { modes: ["bot", "rate-limit"], rateLimitMax: 40 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "ai-rag", cors);
});

router.post("/recommendations", async (req) => {
  const cors = getCorsHeaders(req);
  const arcjet = await arcjetProtect(req, { modes: ["bot", "rate-limit"], rateLimitMax: 60 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "ai-recommendations", cors);
});

router.post("/content-enrichment", async (req) => {
  const cors = getCorsHeaders(req);
  const arcjet = await arcjetProtect(req, { modes: ["bot", "shield"], rateLimitMax: 30 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "ai-content-enrichment", cors);
});

router.post("/eval-run", async (req) => {
  const cors = getCorsHeaders(req);
  const arcjet = await arcjetProtect(req, { modes: ["bot", "shield"], rateLimitMax: 10 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "ai-eval-runner", cors);
});

Deno.serve(router.serve());
