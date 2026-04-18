import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const ALLOWED_SOURCES = new Set([
  "dld_transactions",
  "deliveroo_partner",
  "talabat_partner",
  "careem_partner",
  "openmeteo_weather",
  "google_news_rss",
  "frankfurter_forex",
  "aladhan_prayer_times",
  "custom",
]);

const SOURCE_TO_DOMAIN: Record<string, string> = {
  dld_transactions: "real_estate",
  deliveroo_partner: "food_delivery",
  talabat_partner: "food_delivery",
  careem_partner: "food_delivery",
  openmeteo_weather: "weather",
  google_news_rss: "news",
  frankfurter_forex: "forex",
  aladhan_prayer_times: "prayer",
};

function validateWebhookSecret(req: Request, source: string): boolean {
  const secret = req.headers.get("x-gateway-secret");
  if (!secret) return false;
  const expected = Deno.env.get(`GATEWAY_WEBHOOK_SECRET_${source.toUpperCase()}`);
  if (!expected) {
    const globalSecret = Deno.env.get("GATEWAY_WEBHOOK_SECRET");
    return globalSecret === secret;
  }
  return expected === secret;
}

function normalizeRecords(source: string, records: unknown[]): Array<{
  connector_id: string;
  domain: string;
  timestamp: string;
  data: unknown;
  raw_size: number;
  normalized_at: string;
}> {
  const domain = SOURCE_TO_DOMAIN[source] ?? "custom";
  const now = new Date().toISOString();

  return records.map((record) => {
    const serialized = JSON.stringify(record);
    return {
      connector_id: source,
      domain,
      timestamp: now,
      data: record,
      raw_size: serialized.length,
      normalized_at: now,
    };
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type, x-gateway-source, x-gateway-secret, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST required" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const source = req.headers.get("x-gateway-source") ?? "";
    if (!source || !ALLOWED_SOURCES.has(source)) {
      return new Response(JSON.stringify({ error: "Invalid or missing x-gateway-source header" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!validateWebhookSecret(req, source)) {
      return new Response(JSON.stringify({ error: "Invalid webhook secret" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const bodyData = body?.data ?? body?.records ?? body;
    const rawRecords: unknown[] = Array.isArray(bodyData) ? bodyData : [bodyData];

    const normalizedRecords = normalizeRecords(source, rawRecords);
    const domain = SOURCE_TO_DOMAIN[source] ?? "custom";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, supabaseKey);

    const totalBytes = normalizedRecords.reduce((acc, r) => acc + r.raw_size, 0);

    const { error: logError } = await db.from("gateway_webhook_log").insert({
      source,
      domain,
      record_count: normalizedRecords.length,
      payload_preview: JSON.stringify(normalizedRecords.slice(0, 3)).slice(0, 2000),
      received_at: new Date().toISOString(),
      status: "ingested",
    });

    if (logError) {
      console.error("[gateway-webhook] Log insert error:", logError.message);
    }

    if (normalizedRecords.length > 0) {
      const dataRows = normalizedRecords.slice(0, 100).map((nr) => ({
        connector_id: nr.connector_id,
        domain: nr.domain,
        data: nr.data,
        raw_size: nr.raw_size,
        ingested_at: nr.normalized_at,
      }));

      const { error: dataError } = await db.from("gateway_normalized_data").insert(dataRows);
      if (dataError) {
        console.error("[gateway-webhook] Normalized data insert error:", dataError.message);
      }
    }

    const { error: syncError } = await db.from("gateway_sync_events").insert({
      connector_id: source,
      domain,
      record_count: normalizedRecords.length,
      success: true,
      source_type: "webhook",
      synced_at: new Date().toISOString(),
      total_bytes: totalBytes,
    });

    if (syncError) {
      console.error("[gateway-webhook] Sync event insert error:", syncError.message);
    }

    console.log(`[gateway-webhook] Ingested ${normalizedRecords.length} records from ${source} (${domain})`);

    return new Response(JSON.stringify({
      accepted: true,
      source,
      domain,
      recordCount: normalizedRecords.length,
      normalized: true,
      receivedAt: new Date().toISOString(),
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[gateway-webhook] Error:", String(err));
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
