import { EdgeRouter, proxyToFunction } from "../_shared/edge-function-consolidation.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const router = new EdgeRouter("infra-router", { requireAuth: true, tierAwareRateLimit: true });

router.post("/health", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "health-check", cors);
}, { skipAuth: true, skipRateLimit: true });

router.post("/public-health", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "public-health", cors);
}, { skipAuth: true, skipRateLimit: true });

router.post("/aws-health", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "aws-health-check", cors);
});

router.post("/watchdog", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "watchdog-ping", cors);
});

router.post("/engine-cron", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "engine-cron-server", cors);
});

router.post("/run-engine-cron", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "run-engine-cron", cors);
});

router.post("/run-scheduled-audit", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "run-scheduled-audit", cors);
});

router.post("/runtime-qa", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "master-runtime-qa-engine", cors);
});

router.post("/platform-recovery", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "platform-recovery", cors);
});

router.post("/repair-worker", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "repair-worker", cors);
});

router.post("/browser-user-repair", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "browser-user-repair-engine", cors);
});

router.post("/pipeline-worker", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "pipeline-worker", cors);
});

router.post("/job-queue-worker", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "job-queue-worker", cors);
});

router.post("/job-runner", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "job-runner", cors);
});

router.post("/dispatch-cron", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "dispatch-cron", cors);
});

router.post("/autonomous-cron", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "autonomous-cron-dispatcher", cors);
});

router.post("/omega-loop", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "omega-server-loop", cors);
});

router.post("/sentinel", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "sentinel-server", cors);
});

router.post("/sentinel-guards", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "sentinel-server-guards", cors);
});

router.post("/runtime-control-plane", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "runtime-control-plane", cors);
});

router.post("/backup-storage", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "backup-storage", cors);
});

router.post("/cache-manager", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "cache-manager", cors);
});

router.post("/dlq/ingest", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "dlq-ingest", cors);
});

router.post("/dlq/processor", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "dlq-processor", cors);
});

router.post("/integration-health-cron", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "integration-health-cron", cors);
});

router.post("/integration-health-monitor", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "integration-health-monitor", cors);
});

router.post("/cleanup-integration-health-logs", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "cleanup-integration-health-logs", cors);
});

router.post("/redis/enqueue", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "redis-enqueue", cors);
});

router.post("/redis/proxy", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "redis-proxy", cors);
});

router.post("/uae-data-cleanup", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "uae-data-cleanup", cors);
});

router.post("/cleanup-expired-messages", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "cleanup-expired-messages", cors);
});

router.post("/expire-listings", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "expire-listings", cors);
});

router.post("/expire-pending-referrals", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "expire-pending-referrals", cors);
});

router.post("/dld/analytics", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "dld-analytics", cors);
});

router.post("/dld/sync-cron", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "dld-sync-cron", cors);
});

router.post("/inngest", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "inngest-handler", cors);
}, { skipAuth: true });

router.post("/prayer-times", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "prayer-times", cors);
}, { skipAuth: true });

router.post("/prayer-push-cron", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "prayer-push-cron", cors);
});

Deno.serve(router.serve());
