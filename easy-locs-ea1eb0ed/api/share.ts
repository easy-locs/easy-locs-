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

  try {
    const upstream = await fetch(targetUrl, { headers, redirect: "manual" });

    const location = upstream.headers.get("location");
    if (location && upstream.status >= 300 && upstream.status < 400) {
      res.setHeader("Cache-Control", "no-store, max-age=0, must-revalidate");
      return res.redirect(upstream.status, location);
    }

    const contentType = upstream.headers.get("content-type") || "text/html; charset=utf-8";
    const body = await upstream.text();

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(upstream.status).send(body);
  } catch (err) {
    console.error("Share proxy error:", err);
    return res.status(502).send("Upstream error");
  }
}
