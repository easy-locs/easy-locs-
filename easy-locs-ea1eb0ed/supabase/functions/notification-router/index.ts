import { EdgeRouter, proxyToFunction } from "../_shared/edge-function-consolidation.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const router = new EdgeRouter("notification-router", { requireAuth: true, tierAwareRateLimit: true });

router.post("/email/send", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "send-email", cors);
});

router.post("/email/notification", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "send-notification-email", cors);
});

router.post("/email/enqueue", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "email-enqueue", cors);
});

router.post("/email/process-queue", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "email-queue-process", cors);
});

router.post("/email/receive", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "receive-email", cors);
}, { skipAuth: true });

router.post("/otp/send", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "send-otp", cors);
}, { skipAuth: true });

router.post("/push", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "send-push", cors);
});

router.post("/push/notification", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "send-push-notification", cors);
});

router.post("/push/call", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "send-call-push", cors);
});

router.post("/sms", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "send-sms", cors);
});

router.post("/dispatch", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "notification-dispatcher", cors);
});

router.post("/alert", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "alert-dispatcher", cors);
});

router.post("/payment", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "payment-notification", cors);
});

router.post("/ses-webhook", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "ses-webhook", cors);
}, { skipAuth: true, skipRateLimit: true });

Deno.serve(router.serve());
