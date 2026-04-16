import { EdgeRouter, proxyToFunction } from "../_shared/edge-function-consolidation.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const router = new EdgeRouter("search-router", { requireAuth: true, tierAwareRateLimit: true });

router.post("/global", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "search-global", cors);
}, { skipAuth: true });

router.post("/meilisearch", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "search-meilisearch", cors);
}, { skipAuth: true });

router.post("/sync-meilisearch", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "sync-meilisearch", cors);
});

router.post("/sync-meilisearch-cron", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "sync-meilisearch-cron", cors);
});

router.post("/spatial", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "spatial-query", cors);
}, { skipAuth: true });

router.post("/embeddings/generate", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "generate-embeddings", cors);
});

router.post("/vector-embed", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "vector-embed", cors);
});

Deno.serve(router.serve());
