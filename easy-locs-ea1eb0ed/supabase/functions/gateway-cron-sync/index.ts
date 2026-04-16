import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { CONNECTOR_SPECS, type ConnectorSpec } from "../_shared/gateway-connector-specs.ts";

interface ConnectorDef extends ConnectorSpec {
  fetchFn: () => Promise<{ records: unknown[]; success: boolean; error?: string }>;
}

async function fetchDld(): Promise<{ records: unknown[]; success: boolean; error?: string }> {
  const apiKey = Deno.env.get("DLD_API_KEY");
  if (!apiKey) return { records: [], success: false, error: "DLD_API_KEY not configured" };
  try {
    const res = await fetch("https://gateway.dubailand.gov.ae/open-data/transactions/recent", {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { records: [], success: false, error: `DLD API ${res.status}` };
    const data = await res.json();
    const records = Array.isArray(data) ? data : data?.transactions ?? data?.data ?? [];
    return { records, success: true };
  } catch (err) {
    return { records: [], success: false, error: String(err) };
  }
}

async function fetchWeather(): Promise<{ records: unknown[]; success: boolean; error?: string }> {
  try {
    const res = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=25.2048&longitude=55.2708&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=Asia/Dubai",
      { signal: AbortSignal.timeout(10_000) }
    );
    if (!res.ok) return { records: [], success: false, error: `Weather API ${res.status}` };
    const data = await res.json();
    return { records: [data], success: true };
  } catch (err) {
    return { records: [], success: false, error: String(err) };
  }
}

async function fetchNews(): Promise<{ records: unknown[]; success: boolean; error?: string }> {
  try {
    const res = await fetch(
      "https://news.google.com/rss/search?q=Dubai+real+estate&hl=en-AE&gl=AE&ceid=AE:en",
      { signal: AbortSignal.timeout(10_000) }
    );
    if (!res.ok) return { records: [], success: false, error: `News RSS ${res.status}` };
    const text = await res.text();
    const items = text.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    return { records: items.map((item) => ({ xml: item })), success: true };
  } catch (err) {
    return { records: [], success: false, error: String(err) };
  }
}

async function fetchForex(): Promise<{ records: unknown[]; success: boolean; error?: string }> {
  try {
    const res = await fetch(
      "https://api.frankfurter.app/latest?from=AED&to=USD,EUR,GBP,INR",
      { signal: AbortSignal.timeout(10_000) }
    );
    if (!res.ok) return { records: [], success: false, error: `Forex API ${res.status}` };
    const data = await res.json();
    return { records: [data], success: true };
  } catch (err) {
    return { records: [], success: false, error: String(err) };
  }
}

async function fetchPrayerTimes(): Promise<{ records: unknown[]; success: boolean; error?: string }> {
  try {
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
    const res = await fetch(
      `https://api.aladhan.com/v1/timings/${dateStr}?latitude=25.2048&longitude=55.2708&method=16`,
      { signal: AbortSignal.timeout(10_000) }
    );
    if (!res.ok) return { records: [], success: false, error: `Prayer API ${res.status}` };
    const data = await res.json();
    return { records: [data?.data ?? {}], success: true };
  } catch (err) {
    return { records: [], success: false, error: String(err) };
  }
}

async function fetchMarketplace(source: string, supabaseUrl: string, serviceKey: string): Promise<{ records: unknown[]; success: boolean; error?: string }> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/gateway-marketplace-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-gateway-service-secret": Deno.env.get("GATEWAY_SERVICE_SECRET") ?? "",
      },
      body: JSON.stringify({ source, action: "fetch" }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return { records: [], success: false, error: `Marketplace proxy ${res.status}` };
    const data = await res.json();
    return { records: data?.records ?? [], success: true };
  } catch (err) {
    return { records: [], success: false, error: String(err) };
  }
}

const FETCH_FN_MAP: Record<string, (supabaseUrl: string, serviceKey: string) => () => Promise<{ records: unknown[]; success: boolean; error?: string }>> = {
  dld_transactions: () => fetchDld,
  deliveroo_partner: (url, key) => () => fetchMarketplace("deliveroo", url, key),
  talabat_partner: (url, key) => () => fetchMarketplace("talabat", url, key),
  careem_partner: (url, key) => () => fetchMarketplace("careem", url, key),
  openmeteo_weather: () => fetchWeather,
  google_news_rss: () => fetchNews,
  frankfurter_forex: () => fetchForex,
  aladhan_prayer_times: () => fetchPrayerTimes,
};

function buildConnectors(supabaseUrl: string, serviceKey: string): ConnectorDef[] {
  return CONNECTOR_SPECS.map((spec) => {
    const fetchFactory = FETCH_FN_MAP[spec.id];
    return {
      ...spec,
      fetchFn: fetchFactory ? fetchFactory(supabaseUrl, serviceKey) : () => Promise.resolve({ records: [], success: false, error: "No fetch implementation" }),
    };
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const serviceSecret = Deno.env.get("GATEWAY_SERVICE_SECRET");
  const cronSecret = req.headers.get("x-cron-secret");
  const expectedCronSecret = Deno.env.get("CRON_SECRET");

  const isServiceCall = serviceSecret && req.headers.get("x-gateway-service-secret") === serviceSecret;
  const isCronCall = expectedCronSecret && cronSecret === expectedCronSecret;
  const isServiceRole = authHeader === `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;

  let isAdminUser = false;
  if (!isServiceCall && !isCronCall && !isServiceRole && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (token) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const adminDb = createClient(supabaseUrl, supabaseServiceKey);
        const { data: userData, error: userError } = await adminDb.auth.getUser(token);
        if (!userError && userData?.user) {
          const { data: profile } = await adminDb
            .from("profiles")
            .select("role")
            .eq("id", userData.user.id)
            .single();
          isAdminUser = profile?.role === "admin" || profile?.role === "super_admin";
        }
      } catch {
        isAdminUser = false;
      }
    }
  }

  if (!isServiceCall && !isCronCall && !isServiceRole && !isAdminUser) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, supabaseKey);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty body ok for cron */ }

  const targetConnectorId = typeof body?.connectorId === "string" ? body.connectorId : null;
  const connectors = buildConnectors(supabaseUrl, supabaseKey);
  const toSync = targetConnectorId
    ? connectors.filter((c) => c.id === targetConnectorId)
    : connectors;

  const now = new Date();
  const results: Array<{ id: string; success: boolean; records: number; error?: string }> = [];

  for (const connector of toSync) {
    if (!targetConnectorId) {
      const { data: lastSync } = await db
        .from("gateway_connector_state")
        .select("last_sync_at")
        .eq("connector_id", connector.id)
        .single();

      if (lastSync?.last_sync_at) {
        const lastSyncTime = new Date(lastSync.last_sync_at).getTime();
        const intervalMs = connector.pollingIntervalMin * 60_000;
        if (now.getTime() - lastSyncTime < intervalMs) {
          results.push({ id: connector.id, success: true, records: 0, error: "skipped (not due)" });
          continue;
        }
      }
    }

    const start = Date.now();
    const result = await connector.fetchFn();
    const durationMs = Date.now() - start;
    const totalBytes = JSON.stringify(result.records).length;

    const { error: syncEventErr } = await db.from("gateway_sync_events").insert({
      connector_id: connector.id,
      domain: connector.domain,
      record_count: result.records.length,
      success: result.success,
      source_type: "cron",
      synced_at: now.toISOString(),
      total_bytes: totalBytes,
      duration_ms: durationMs,
      error: result.error ?? null,
    });
    if (syncEventErr) {
      console.error(`[gateway-cron] Sync event insert error for ${connector.id}:`, syncEventErr.message);
    }

    const status = result.success ? "connected" : "degraded";
    const { error: stateErr } = await db.from("gateway_connector_state").upsert({
      connector_id: connector.id,
      connector_name: connector.name,
      domain: connector.domain,
      status,
      last_sync_at: now.toISOString(),
      last_success_at: result.success ? now.toISOString() : undefined,
      last_error: result.error ?? null,
      last_record_count: result.records.length,
      last_duration_ms: durationMs,
      updated_at: now.toISOString(),
    }, { onConflict: "connector_id" });
    if (stateErr) {
      console.error(`[gateway-cron] State upsert error for ${connector.id}:`, stateErr.message);
    }

    if (result.success && result.records.length > 0) {
      const normalized = result.records.map((record) => ({
        connector_id: connector.id,
        domain: connector.domain,
        data: record,
        raw_size: JSON.stringify(record).length,
        ingested_at: now.toISOString(),
      }));
      const batch = normalized.slice(0, 100);
      const { error: normInsertErr } = await db.from("gateway_normalized_data").insert(batch);
      if (normInsertErr) {
        console.error(`[gateway-cron] Normalized data insert error for ${connector.id}:`, normInsertErr.message);
      }
    }

    results.push({ id: connector.id, success: result.success, records: result.records.length, error: result.error });
  }

  const successCount = results.filter((r) => r.success && r.records > 0).length;
  const totalRecords = results.reduce((acc, r) => acc + r.records, 0);

  return new Response(JSON.stringify({
    syncedAt: now.toISOString(),
    connectorsSynced: results.length,
    successCount,
    totalRecords,
    results,
  }), {
    headers: { "Content-Type": "application/json" },
  });
});
