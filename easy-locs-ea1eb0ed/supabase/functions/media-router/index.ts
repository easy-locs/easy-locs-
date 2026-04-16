import { EdgeRouter } from "../_shared/edge-function-consolidation.ts";
import { arcjetProtect, arcjetDenyResponse } from "../_shared/arcjet-protection.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const router = new EdgeRouter("media-router");

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
  const contentType = resp.headers.get("Content-Type");
  if (contentType) responseHeaders.set("Content-Type", contentType);
  const contentDisposition = resp.headers.get("Content-Disposition");
  if (contentDisposition) responseHeaders.set("Content-Disposition", contentDisposition);

  return new Response(resp.body, { status: resp.status, headers: responseHeaders });
}

router.post("/process", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["bot", "rate-limit"], rateLimitMax: 30 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "media-processor");
});

router.post("/video", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["bot", "rate-limit"], rateLimitMax: 10 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "video-processor");
});

router.post("/s3-upload", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["bot", "rate-limit"], rateLimitMax: 30 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "s3-upload-proxy");
});

router.post("/cleanup/expired", async (req) => {
  return proxyToFunction(req, "cleanup-expired-media");
});

router.post("/cleanup/orphan", async (req) => {
  return proxyToFunction(req, "cleanup-orphan-media");
});

router.post("/onboarding", async (req) => {
  return proxyToFunction(req, "process-onboarding-media");
});

router.post("/pdf/generate", async (req) => {
  return proxyToFunction(req, "generate-pdf");
});

router.post("/ical/export", async (req) => {
  return proxyToFunction(req, "export-ical");
});

router.post("/ical/sync", async (req) => {
  return proxyToFunction(req, "sync-ical");
});

router.post("/rss", async (req) => {
  return proxyToFunction(req, "rss-proxy");
});

router.post("/scrape", async (req) => {
  return proxyToFunction(req, "scrape-proxy");
});

router.post("/scrape/auto-source", async (req) => {
  return proxyToFunction(req, "auto-source-scrape");
});

router.post("/scrape/deep-build", async (req) => {
  return proxyToFunction(req, "deep-scrape-build");
});

router.post("/lambda/invoke", async (req) => {
  return proxyToFunction(req, "lambda-invoke-proxy");
});

router.post("/sqs/enqueue", async (req) => {
  return proxyToFunction(req, "sqs-enqueue-proxy");
});

router.post("/fx-rates", async (req) => {
  return proxyToFunction(req, "fx-rates");
});

router.post("/voice/transcribe", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["bot", "rate-limit"], rateLimitMax: 20 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "voice-processing");
});

router.post("/voice/tts", async (req) => {
  const arcjet = await arcjetProtect(req, { modes: ["bot", "rate-limit"], rateLimitMax: 20 });
  if (!arcjet.allowed) return arcjetDenyResponse(arcjet);
  return proxyToFunction(req, "tts-engine");
});

Deno.serve(router.serve());
