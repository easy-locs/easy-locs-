import { EdgeRouter, proxyToFunction } from "../_shared/edge-function-consolidation.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const router = new EdgeRouter("rent-router", { requireAuth: true, tierAwareRateLimit: true });

router.post("/payment", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "rent-payment", cors);
});

router.post("/create-payment", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "rent-create-payment", cors);
});

router.post("/lifecycle-cron", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "rent-lifecycle-cron", cors);
});

router.post("/reminders", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "rent-reminders", cors);
});

router.post("/collect-sepa", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "collect-sepa-rents", cors);
});

router.post("/lease-workflow", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "lease-workflow", cors);
});

router.post("/tenant-signup", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "tenant-signup", cors);
}, { skipAuth: true });

router.post("/generate-receipt", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "generate-rent-receipt", cors);
});

router.post("/legal-notice-payment", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "create-legal-notice-payment", cors);
});

Deno.serve(router.serve());
