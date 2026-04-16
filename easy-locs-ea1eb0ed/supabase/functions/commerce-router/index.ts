import { EdgeRouter } from "../_shared/edge-function-consolidation.ts";
import { arcjetProtect, arcjetDenyResponse } from "../_shared/arcjet-protection.ts";
import { trackBackendEvent } from "../_shared/segment-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const router = new EdgeRouter("commerce-router");

async function proxyToFunction(req: Request, functionName: string): Promise<Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  const resp = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: req.method,
    headers: {
      Authorization: authHeader,
      "Content-Type": req.headers.get("Content-Type") ?? "application/json",
      "x-forwarded-for": req.headers.get("x-forwarded-for") ?? "",
      "cf-connecting-ip": req.headers.get("cf-connecting-ip") ?? "",
    },
    body: req.body,
    // @ts-ignore Deno supports duplex
    duplex: "half",
  });

  const responseHeaders = new Headers(corsHeaders);
  const ct = resp.headers.get("Content-Type");
  if (ct) responseHeaders.set("Content-Type", ct);
  return new Response(resp.body, { status: resp.status, headers: responseHeaders });
}

router.post("/booking/create", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["bot", "shield", "rate-limit"], rateLimitMax: 10 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  trackBackendEvent("system", "booking.created");
  return proxyToFunction(req, "booking-create");
});

router.post("/booking/approve", async (req) => {
  return proxyToFunction(req, "booking-approve");
});

router.post("/booking/complete", async (req) => {
  trackBackendEvent("system", "booking.completed");
  return proxyToFunction(req, "booking-complete");
});

router.post("/booking/reject", async (req) => {
  return proxyToFunction(req, "booking-reject");
});

router.post("/booking/lifecycle", async (req) => {
  return proxyToFunction(req, "booking-lifecycle");
});

router.post("/booking/payment", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["shield", "rate-limit"], rateLimitMax: 10 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "create-booking-payment");
});

router.post("/booking/notify", async (req) => {
  return proxyToFunction(req, "notify-booking");
});

router.post("/checkout", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["shield", "rate-limit"], rateLimitMax: 10 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "create-checkout");
});

router.post("/checkout/session", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["shield"] });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "create-checkout-session");
});

router.post("/checkout/listing", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["shield"] });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "create-listing-checkout");
});

router.post("/checkout/storefront", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["shield"] });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "create-storefront-checkout");
});

router.post("/checkout/guest", async (req) => {
  return proxyToFunction(req, "create-guest-checkout");
});

router.post("/checkout/concierge", async (req) => {
  return proxyToFunction(req, "create-concierge-payment");
});

router.post("/checkout/legal-notice", async (req) => {
  return proxyToFunction(req, "create-legal-notice-payment");
});

router.post("/stripe/intent", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["shield", "rate-limit"], rateLimitMax: 10 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "create-stripe-intent");
});

router.post("/stripe/webhook", async (req) => {
  trackBackendEvent("system", "stripe.webhook_received");
  return proxyToFunction(req, "stripe-webhook");
});

router.post("/stripe/connect/create", async (req) => {
  return proxyToFunction(req, "create-connect-account");
});

router.post("/stripe/connect/status", async (req) => {
  return proxyToFunction(req, "check-connect-status");
});

router.post("/stripe/connect/login", async (req) => {
  return proxyToFunction(req, "stripe-connect-login");
});

router.post("/stripe/connect/disconnect", async (req) => {
  return proxyToFunction(req, "disconnect-stripe");
});

router.post("/subscription/create", async (req) => {
  return proxyToFunction(req, "create-subscription");
});

router.post("/subscription/manage", async (req) => {
  return proxyToFunction(req, "manage-subscription");
});

router.post("/subscription/portal", async (req) => {
  return proxyToFunction(req, "subscription-portal");
});

router.post("/subscription/check", async (req) => {
  return proxyToFunction(req, "check-subscription");
});

router.post("/subscription/customer-portal", async (req) => {
  return proxyToFunction(req, "customer-portal");
});

router.post("/payment/capture", async (req) => {
  return proxyToFunction(req, "capture-payment-intent");
});

router.post("/payment/notification", async (req) => {
  trackBackendEvent("system", "payment.notification_received");
  return proxyToFunction(req, "payment-notification");
});

router.post("/payment/qr-session", async (req) => {
  return proxyToFunction(req, "qr-payment-session");
});

router.post("/payment/verify-guest", async (req) => {
  return proxyToFunction(req, "verify-guest-payment");
});

router.post("/crypto/payment", async (req) => {
  return proxyToFunction(req, "crypto-payment");
});

router.post("/crypto/webhook", async (req) => {
  return proxyToFunction(req, "crypto-webhook");
});

router.post("/mobile-money/payment", async (req) => {
  return proxyToFunction(req, "mobile-money-payment");
});

router.post("/mobile-money/webhook", async (req) => {
  return proxyToFunction(req, "mobile-money-webhook");
});

router.post("/refund/process", async (req) => {
  return proxyToFunction(req, "process-refund");
});

router.post("/refund/admin", async (req) => {
  return proxyToFunction(req, "refund-admin");
});

router.post("/refund/booking/process", async (req) => {
  return proxyToFunction(req, "refund-process-booking");
});

router.post("/refund/booking/request", async (req) => {
  return proxyToFunction(req, "refund-request-booking");
});

router.post("/payout/request", async (req) => {
  return proxyToFunction(req, "payout-request-create");
});

router.post("/payout/approve", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["shield"] });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "admin-payout-approve");
});

router.post("/payout/reject", async (req) => {
  return proxyToFunction(req, "admin-payout-reject");
});

router.post("/sepa/collect", async (req) => {
  return proxyToFunction(req, "collect-sepa-rents");
});

router.post("/commission/split", async (req) => {
  return proxyToFunction(req, "commission-split");
});

router.post("/order/manage", async (req) => {
  return proxyToFunction(req, "order-manage");
});

router.post("/loyalty/award", async (req) => {
  return proxyToFunction(req, "award-loyalty-points");
});

router.post("/purchase-locs", async (req) => {
  return proxyToFunction(req, "purchase-locs");
});

Deno.serve(router.serve());
