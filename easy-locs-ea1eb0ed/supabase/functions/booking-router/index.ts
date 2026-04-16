import { EdgeRouter, proxyToFunction } from "../_shared/edge-function-consolidation.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const router = new EdgeRouter("booking-router", { requireAuth: true, tierAwareRateLimit: true });

router.post("/create", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "booking-create", cors);
});

router.post("/approve", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "booking-approve", cors);
});

router.post("/reject", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "booking-reject", cors);
});

router.post("/complete", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "booking-complete", cors);
});

router.post("/lifecycle", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "booking-lifecycle", cors);
});

router.post("/notify", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "notify-booking", cors);
});

router.post("/create-payment", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "create-booking-payment", cors);
});

router.post("/create-concierge-payment", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "create-concierge-payment", cors);
});

router.post("/ical/export", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "export-ical", cors);
});

router.post("/ical/sync", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "sync-ical", cors);
});

router.post("/submit-review", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "submit-review", cors);
});

Deno.serve(router.serve());
