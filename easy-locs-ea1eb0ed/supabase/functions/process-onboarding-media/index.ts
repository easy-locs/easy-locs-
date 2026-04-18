import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireAuthenticatedUser } from "../_shared/edge-auth.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const BUCKET_NAME = "onboarding-media";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MIN_DIMENSION = 100;
const THUMB_WIDTH = 400;
const DOWNLOAD_TIMEOUT_MS = 15_000;
const WEBP_QUALITY = 0.82;

const BLOCKED_HOSTS = /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.|169\.254\.|::1|fc00:|fe80:|0000:)/i;

interface ProcessRequest {
  urls: string[];
  entityId: string;
}

interface ProcessedImage {
  originalUrl: string;
  hostedUrl: string;
  thumbUrl: string | null;
  width: number;
  height: number;
  fileSize: number;
  format: string;
  failed: boolean;
  failReason: string | null;
}

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    if (BLOCKED_HOSTS.test(parsed.hostname)) return false;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(parsed.hostname)) {
      const parts = parsed.hostname.split(".").map(Number);
      if (parts[0] === 10) return false;
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false;
      if (parts[0] === 192 && parts[1] === 168) return false;
      if (parts[0] === 127) return false;
      if (parts[0] === 0) return false;
      if (parts[0] === 169 && parts[1] === 254) return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function fetchImage(url: string): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  if (!isAllowedUrl(url)) throw new Error("Blocked: private/internal network");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "EasyLocs-MediaPipeline/1.0" },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      const ext = url.match(/\.(jpe?g|png|webp|avif|gif)(\?|$)/i);
      if (!ext) throw new Error(`Not an image: ${contentType}`);
    }
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_FILE_SIZE) throw new Error(`File too large: ${buffer.byteLength}`);
    if (buffer.byteLength === 0) throw new Error("Empty response");
    return { buffer, contentType };
  } finally {
    clearTimeout(timer);
  }
}

function extractDimensions(buffer: ArrayBuffer): { width: number; height: number } | null {
  const view = new DataView(buffer);
  const arr = new Uint8Array(buffer);

  if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47 && buffer.byteLength >= 24) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }

  if (arr[0] === 0xFF && arr[1] === 0xD8) {
    let offset = 2;
    while (offset < buffer.byteLength - 1) {
      if (arr[offset] !== 0xFF) break;
      const marker = arr[offset + 1];
      if (marker === 0xC0 || marker === 0xC2) {
        if (offset + 9 < buffer.byteLength) {
          return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) };
        }
      }
      if (marker === 0xD9 || marker === 0xDA) break;
      const segLen = offset + 2 < buffer.byteLength ? view.getUint16(offset + 2) : 0;
      if (segLen < 2) break;
      offset += 2 + segLen;
    }
  }

  if (arr[0] === 0x47 && arr[1] === 0x49 && arr[2] === 0x46 && buffer.byteLength >= 10) {
    return { width: arr[6] | (arr[7] << 8), height: arr[8] | (arr[9] << 8) };
  }

  if (buffer.byteLength >= 30) {
    const head = new TextDecoder().decode(arr.slice(0, Math.min(40, buffer.byteLength)));
    if (head.includes("RIFF") && head.includes("WEBP")) {
      if (arr[15] === 0x58 && buffer.byteLength >= 30) {
        return { width: 1 + (arr[24] | (arr[25] << 8) | (arr[26] << 16)), height: 1 + (arr[27] | (arr[28] << 8) | (arr[29] << 16)) };
      }
      if (arr[15] === 0x4C && buffer.byteLength >= 25) {
        const bits = view.getUint32(21, true);
        return { width: (bits & 0x3FFF) + 1, height: ((bits >> 14) & 0x3FFF) + 1 };
      }
      if (buffer.byteLength >= 30) {
        return { width: view.getUint16(26, true), height: view.getUint16(28, true) };
      }
    }
  }

  return null;
}

async function convertToWebP(buffer: ArrayBuffer, targetWidth?: number): Promise<{ webpBuffer: ArrayBuffer; width: number; height: number }> {
  const blob = new Blob([buffer]);
  const bitmap = await createImageBitmap(blob);
  const srcW = bitmap.width;
  const srcH = bitmap.height;

  let outW = srcW;
  let outH = srcH;
  if (targetWidth && srcW > targetWidth) {
    outW = targetWidth;
    outH = Math.round(srcH * (targetWidth / srcW));
  }

  const canvas = new OffscreenCanvas(outW, outH);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, outW, outH);
  bitmap.close();

  const webpBlob = await canvas.convertToBlob({ type: "image/webp", quality: WEBP_QUALITY });
  const webpBuffer = await webpBlob.arrayBuffer();
  return { webpBuffer, width: outW, height: outH };
}

function storagePath(prefix: string, index: number, variant: "original" | "thumb"): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}/${variant}/${ts}_${index}_${rand}.webp`;
}

async function processOne(
  url: string,
  index: number,
  prefix: string,
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
): Promise<ProcessedImage> {
  try {
    const { buffer } = await fetchImage(url);
    const dims = extractDimensions(buffer);
    const width = dims?.width ?? 0;
    const height = dims?.height ?? 0;

    if (dims && (width < MIN_DIMENSION || height < MIN_DIMENSION)) {
      return { originalUrl: url, hostedUrl: url, thumbUrl: null, width, height, fileSize: buffer.byteLength, format: "webp", failed: true, failReason: `Dimensions too small: ${width}x${height}` };
    }

    if (width === 0 || height === 0) {
      return { originalUrl: url, hostedUrl: url, thumbUrl: null, width, height, fileSize: buffer.byteLength, format: "unknown", failed: true, failReason: "Could not determine image dimensions" };
    }

    const conv = await convertToWebP(buffer);

    const origPath = storagePath(prefix, index, "original");
    const { error: upErr } = await supabase.storage.from(BUCKET_NAME).upload(origPath, conv.webpBuffer, { contentType: "image/webp", upsert: true });
    if (upErr) throw upErr;
    const hostedUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${origPath}`;

    let thumbUrl: string | null = null;
    if (conv.width > THUMB_WIDTH) {
      try {
        const thumb = await convertToWebP(buffer, THUMB_WIDTH);
        const thumbPath = storagePath(prefix, index, "thumb");
        const { error: thErr } = await supabase.storage.from(BUCKET_NAME).upload(thumbPath, thumb.webpBuffer, { contentType: "image/webp", upsert: true });
        if (!thErr) thumbUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${thumbPath}`;
      } catch { /* thumb generation is best-effort */ }
    }

    return { originalUrl: url, hostedUrl, thumbUrl, width: conv.width, height: conv.height, fileSize: conv.webpBuffer.byteLength, format: "webp", failed: false, failReason: null };
  } catch (err: unknown) {
    return { originalUrl: url, hostedUrl: url, thumbUrl: null, width: 0, height: 0, fileSize: 0, format: "unknown", failed: true, failReason: err instanceof Error ? err.message : "Unknown error" };
  }
}

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const authCheck = await requireAuthenticatedUser(req);
  if (!authCheck.authorized) return authCheck.response!;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body: ProcessRequest = await req.json();
    const { urls, entityId } = body;

    if (!urls || !Array.isArray(urls) || !entityId) {
      return new Response(JSON.stringify({ error: "urls (array) and entityId are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const prefix = `imports/${entityId}`;
    const concurrency = 5;
    const results: ProcessedImage[] = [];

    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map((url, batchIdx) => processOne(url, i + batchIdx, prefix, supabase, supabaseUrl)),
      );
      results.push(...batchResults);
    }

    return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[process-onboarding-media] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
