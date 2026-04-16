import { EdgeRouter, proxyToFunction } from "../_shared/edge-function-consolidation.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { arcjetProtect, arcjetDenyResponse } from "../_shared/arcjet-protection.ts";

const router = new EdgeRouter("voice-router", { requireAuth: true, tierAwareRateLimit: true });

router.post("/transcribe", async (req) => {
  const cors = getCorsHeaders(req);
  const arcjet = await arcjetProtect(req, { modes: ["bot", "rate-limit"], rateLimitMax: 20 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "voice-processing", cors);
});

router.post("/tts", async (req) => {
  const cors = getCorsHeaders(req);
  const arcjet = await arcjetProtect(req, { modes: ["bot", "rate-limit"], rateLimitMax: 20 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "tts-engine", cors);
});

router.post("/stt-token", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "voice-stt-token", cors);
});

router.post("/livekit-room-token", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "livekit-room-token", cors);
});

router.post("/turn-credentials", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "get-turn-credentials", cors);
});

router.post("/mux-upload", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "mux-upload", cors);
});

router.post("/presence", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "presence-heartbeat", cors);
});

router.post("/tts-v2", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "voice-tts", cors);
});

router.post("/plaid/link-token", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "plaid-link-token", cors);
});

router.post("/plaid/webhook", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "plaid-webhook", cors);
}, { skipAuth: true, skipRateLimit: true });

Deno.serve(router.serve());
