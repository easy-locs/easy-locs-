import { EdgeRouter, proxyToFunction } from "../_shared/edge-function-consolidation.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const router = new EdgeRouter("stripe-router", { requireAuth: true, tierAwareRateLimit: true });

router.post("/webhook", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "stripe-webhook", cors);
}, { skipAuth: true, skipRateLimit: true });

router.post("/connect-login", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "stripe-connect-login", cors);
});

router.post("/check-connect-status", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "check-connect-status", cors);
});

router.post("/create-connect-account", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "create-connect-account", cors);
});

router.post("/disconnect", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "disconnect-stripe", cors);
});

router.post("/create-intent", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "create-stripe-intent", cors);
});

router.post("/capture-intent", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "capture-payment-intent", cors);
});

router.post("/create-checkout", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "create-checkout", cors);
});

router.post("/create-checkout-session", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "create-checkout-session", cors);
});

router.post("/create-subscription", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "create-subscription", cors);
});

router.post("/manage-subscription", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "manage-subscription", cors);
});

router.post("/subscription-portal", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "subscription-portal", cors);
});

router.post("/customer-portal", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "customer-portal", cors);
});

router.post("/create-guest-checkout", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "create-guest-checkout", cors);
}, { skipAuth: true });

router.post("/create-listing-checkout", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "create-listing-checkout", cors);
});

router.post("/create-storefront-checkout", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "create-storefront-checkout", cors);
});

router.post("/verify-guest-payment", async (req) => {
  const cors = getCorsHeaders(req);
  return proxyToFunction(req, "verify-guest-payment", cors);
}, { skipAuth: true });

Deno.serve(router.serve());
