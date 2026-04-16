import { EdgeRouter, proxyToFunction } from "../_shared/edge-function-consolidation.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { arcjetProtect, arcjetDenyResponse } from "../_shared/arcjet-protection.ts";

const router = new EdgeRouter("media-router", { requireAuth: true, tierAwareRateLimit: true });

router.post("/process", async (req) => {
  const cors = getCorsHeaders(req);
  const arcjet = await arcjetProtect(req, { modes: ["bot", "rate-limit"], rateLimitMax: 30 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "media-processor", cors);
});

router.post("/video", async (req) => {
  const cors = getCorsHeaders(req);
  const arcjet = await arcjetProtect(req, { modes: ["bot", "rate-limit"], rateLimitMax: 10 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "video-processor", cors);
});

router.post("/s3-upload", async (req) => {
  const cors = getCorsHeaders(req);
  const arcjet = await arcjetProtect(req, { modes: ["bot", "rate-limit"], rateLimitMax: 30 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "s3-upload-proxy", cors);
});

router.post("/cleanup/expired", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "cleanup-expired-media", cors);
});

router.post("/cleanup/orphan", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "cleanup-orphan-media", cors);
});

router.post("/onboarding", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "process-onboarding-media", cors);
});

router.post("/pdf/generate", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "generate-pdf", cors);
});

router.post("/ical/export", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "export-ical", cors);
});

router.post("/ical/sync", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "sync-ical", cors);
});

router.post("/rss", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "rss-proxy", cors);
});

router.post("/scrape", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "scrape-proxy", cors);
});

router.post("/scrape/auto-source", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "auto-source-scrape", cors);
});

router.post("/scrape/deep-build", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "deep-scrape-build", cors);
});

router.post("/lambda/invoke", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "lambda-invoke-proxy", cors);
});

router.post("/sqs/enqueue", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "sqs-enqueue-proxy", cors);
});

router.post("/fx-rates", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "fx-rates", cors);
});

router.post("/voice/transcribe", async (req) => {
  const cors = getCorsHeaders(req);
  const arcjet = await arcjetProtect(req, { modes: ["bot", "rate-limit"], rateLimitMax: 20 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "voice-processing", cors);
});

router.post("/voice/tts", async (req) => {
  const cors = getCorsHeaders(req);
  const arcjet = await arcjetProtect(req, { modes: ["bot", "rate-limit"], rateLimitMax: 20 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "tts-engine", cors);
});

Deno.serve(router.serve());
