import { EdgeRouter, proxyToFunction } from "../_shared/edge-function-consolidation.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const router = new EdgeRouter("admin-router", { requireAuth: true, tierAwareRateLimit: true });

router.post("/payout/approve", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "admin-payout-approve", cors);
});

router.post("/payout/reject", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "admin-payout-reject", cors);
});

router.post("/trigger", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "admin-trigger", cors);
});

router.post("/auto-onboarding-cron", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "auto-onboarding-cron", cors);
});

router.post("/kyc-review", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "kyc-review", cors);
});

router.post("/audit-export", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "audit-export", cors);
});

router.post("/refund/admin", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "refund-admin", cors);
});

router.post("/refund/process", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "refund-process-booking", cors);
});

router.post("/refund/request", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "refund-request-booking", cors);
});

router.post("/process-refund", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "process-refund", cors);
});

router.post("/command-center", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "command-center-api", cors);
});

router.post("/command/monitoring-cron", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "command-monitoring-cron", cors);
});

router.post("/command/approval-webhook", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "command-approval-webhook", cors);
}, { skipAuth: true });

router.post("/command/email-intake", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "command-email-intake", cors);
}, { skipAuth: true });

router.post("/command/github-webhook", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "command-github-webhook", cors);
}, { skipAuth: true });

router.post("/seller-kpi-snapshot", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "seller-kpi-snapshot", cors);
});

router.post("/ops-ai-chat", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "ops-ai-chat", cors);
});

Deno.serve(router.serve());
