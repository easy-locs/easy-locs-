import { EdgeRouter, proxyToFunction } from "../_shared/edge-function-consolidation.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const router = new EdgeRouter("gdpr-router", { requireAuth: true, tierAwareRateLimit: true });

router.post("/delete-account", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "gdpr-delete-account", cors);
});

router.post("/deletion-processor", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "gdpr-deletion-processor", cors);
});

router.post("/export", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "gdpr-export", cors);
});

Deno.serve(router.serve());
