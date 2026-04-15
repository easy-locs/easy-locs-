import type { VercelRequest, VercelResponse } from "@vercel/node";

const SUPABASE_FUNCTION_URL =
  process.env.SUPABASE_SOCIAL_PREVIEW_URL ||
  "https://ifvuvbolrmuuugtzxsfk.supabase.co/functions/v1/social-preview";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  const type = (req.query.type as string) || "";
  const slug = (req.query.slug as string) || "";

  if (!type || !slug) {
    return res.status(400).send("Missing type or slug");
  }

  const params = new URLSearchParams({ type, slug });
  const v = req.query.v as string | undefined;
  if (v) params.set("v", v);

  const targetUrl = `${SUPABASE_FUNCTION_URL}?${params.toString()}`;

  const headers: Record<string, string> = {};
  const ua = req.headers["user-agent"];
  if (ua) headers["User-Agent"] = ua;

  const volatileTypes = new Set(["forex", "location", "analytics"]);
  const isVolatile = volatileTypes.has(type);
  const cacheHeader = isVolatile
    ? "s-maxage=60, stale-while-revalidate=120"
    : "s-maxage=300, stale-while-revalidate=600";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const upstream = await fetch(targetUrl, { headers, redirect: "manual", signal: controller.signal });
    clearTimeout(timeout);

    const location = upstream.headers.get("location");
    if (location && upstream.status >= 300 && upstream.status < 400) {
      res.setHeader("Cache-Control", "no-store, max-age=0, must-revalidate");
      return res.redirect(upstream.status, location);
    }

    const contentType = upstream.headers.get("content-type") || "text/html; charset=utf-8";
    const body = await upstream.text();

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", cacheHeader);
    return res.status(upstream.status).send(body);
  } catch (err) {
    clearTimeout(timeout);
    console.error("Share proxy error:", err);
    const appUrl = process.env.APP_URL || "https://www.easy-locs.com";
    const fallbackHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Easy-Locs</title><meta property="og:title" content="Easy-Locs"/><meta property="og:image" content="${appUrl}/og-default.jpg"/><meta http-equiv="refresh" content="0;url=${appUrl}"/></head><body><p>Redirecting...</p></body></html>`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(fallbackHtml);
  }
}
