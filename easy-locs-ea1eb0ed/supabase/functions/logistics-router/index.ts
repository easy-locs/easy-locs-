import { EdgeRouter, proxyToFunction } from "../_shared/edge-function-consolidation.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const router = new EdgeRouter("logistics-router", { requireAuth: true, tierAwareRateLimit: true });

router.post("/dispatch-delivery", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "dispatch-delivery", cors);
});

router.post("/dispatch-ride", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "dispatch-ride", cors);
});

router.post("/webhook", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "dispatch-webhook", cors);
}, { skipAuth: true, skipRateLimit: true });

router.post("/order-manage", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "order-manage", cors);
});

Deno.serve(router.serve());
