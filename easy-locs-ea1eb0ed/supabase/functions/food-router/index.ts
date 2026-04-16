import { EdgeRouter, proxyToFunction } from "../_shared/edge-function-consolidation.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const router = new EdgeRouter("food-router", { requireAuth: true, tierAwareRateLimit: true });

router.post("/audit", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "food-audit", cors);
});

router.post("/menu-builder", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "food-menu-builder", cors);
});

router.post("/normalizer", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "food-normalizer", cors);
});

router.post("/publish", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "food-publish", cors);
});

router.post("/rescrape-monitor", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "food-rescrape-monitor", cors);
});

router.post("/visibility-gate", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "food-visibility-gate", cors);
});

router.post("/visual-clean", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "food-visual-clean", cors);
});

router.post("/deliveroo", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "deliveroo-dubai-food", cors);
});

router.post("/ingestion-pipeline", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "run-ingestion-pipeline", cors);
});

router.post("/deep-scrape", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "deep-scrape-build", cors);
});

router.post("/auto-source-scrape", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "auto-source-scrape", cors);
});

Deno.serve(router.serve());
