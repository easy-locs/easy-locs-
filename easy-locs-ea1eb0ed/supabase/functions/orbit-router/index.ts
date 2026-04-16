import { EdgeRouter } from "../_shared/edge-function-consolidation.ts";
import { arcjetProtect, arcjetDenyResponse } from "../_shared/arcjet-protection.ts";
import { trackBackendEvent } from "../_shared/segment-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const router = new EdgeRouter("orbit-router");

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

router.post("/email/send", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["bot", "rate-limit"], rateLimitMax: 30 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "send-email");
});

router.post("/email/notification", async (req) => {
  return proxyToFunction(req, "send-notification-email");
});

router.post("/email/enqueue", async (req) => {
  return proxyToFunction(req, "email-enqueue");
});

router.post("/email/process-queue", async (req) => {
  return proxyToFunction(req, "email-queue-process");
});

router.post("/email/receive", async (req) => {
  return proxyToFunction(req, "receive-email");
});

router.post("/email/ses-webhook", async (req) => {
  return proxyToFunction(req, "ses-webhook");
});

router.post("/sms/send", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["bot", "rate-limit"], rateLimitMax: 20 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "send-sms");
});

router.post("/push/send", async (req) => {
  return proxyToFunction(req, "send-push");
});

router.post("/push/notification", async (req) => {
  return proxyToFunction(req, "send-push-notification");
});

router.post("/push/call", async (req) => {
  return proxyToFunction(req, "send-call-push");
});

router.post("/notification/dispatch", async (req) => {
  return proxyToFunction(req, "notification-dispatcher");
});

router.post("/alert/dispatch", async (req) => {
  return proxyToFunction(req, "alert-dispatcher");
});

router.post("/contact/reveal", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["shield", "rate-limit"], rateLimitMax: 5 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "reveal-contact");
});

router.post("/messages/cleanup", async (req) => {
  return proxyToFunction(req, "cleanup-expired-messages");
});

router.post("/payment", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["shield", "rate-limit"], rateLimitMax: 10 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "orbit-payment");
});

router.post("/turn-credentials", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["shield", "rate-limit"], rateLimitMax: 5 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "get-turn-credentials");
});

router.post("/presence/heartbeat", async (req) => {
  return proxyToFunction(req, "presence-heartbeat");
});

router.post("/prayer/push-cron", async (req) => {
  return proxyToFunction(req, "prayer-push-cron");
});

router.post("/prayer/times", async (req) => {
  return proxyToFunction(req, "prayer-times");
});

Deno.serve(router.serve());
