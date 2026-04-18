import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
/**
 * prayer-times — Fetches Islamic prayer times from Al-Adhan API and caches them.
 * Cache TTL: 24h per location (lat/lng rounded to 2 decimal places).
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

import { cFromEdge, cRpcEdge } from "../_shared/execution/content-mutation.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const ALADHAN_BASE = "https://api.aladhan.com/v1";
const CACHE_TTL_HOURS = 24;

interface PrayerTimesResult {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  date: string;
  hijri_date: string;
  timezone: string;
  method: number;
  lat: number;
  lng: number;
}

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const url = new URL(req.url);
    const latParam = url.searchParams.get("lat");
    const lngParam = url.searchParams.get("lng");
    const method = parseInt(url.searchParams.get("method") ?? "2"); // 2 = ISNA (default)

    if (!latParam || !lngParam) {
      return new Response(
        JSON.stringify({ error: "lat and lng are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lat = parseFloat(latParam);
    const lng = parseFloat(lngParam);

    if (isNaN(lat) || isNaN(lng)) {
      return new Response(
        JSON.stringify({ error: "Invalid lat/lng" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Round to 2 decimal places for cache key (≈1km precision)
    const cacheKeyLat = Math.round(lat * 100) / 100;
    const cacheKeyLng = Math.round(lng * 100) / 100;
    const today = new Date().toISOString().split("T")[0];
    const cacheId = `${cacheKeyLat}_${cacheKeyLng}_${today}_${method}`;

    // Check cache
    const { data: cached } = await supabase
      .from("prayer_times_cache")
      .select("*")
      .eq("cache_key", cacheId)
      .gte("expires_at", new Date().toISOString())
      .single();

    if (cached) {
      return new Response(
        JSON.stringify({ data: cached.prayer_data, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch from Al-Adhan
    const apiUrl = `${ALADHAN_BASE}/timings?latitude=${lat}&longitude=${lng}&method=${method}`;
    const resp = await fetch(apiUrl, { headers: { Accept: "application/json" } });

    if (!resp.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch prayer times from Al-Adhan API" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const json = await resp.json();
    if (json.code !== 200 || !json.data?.timings) {
      return new Response(
        JSON.stringify({ error: "Invalid response from Al-Adhan API" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const timings = json.data.timings;
    const dateInfo = json.data.date;
    const meta = json.data.meta;

    const result: PrayerTimesResult = {
      fajr: timings.Fajr,
      sunrise: timings.Sunrise,
      dhuhr: timings.Dhuhr,
      asr: timings.Asr,
      maghrib: timings.Maghrib,
      isha: timings.Isha,
      date: dateInfo.gregorian?.date ?? today,
      hijri_date: dateInfo.hijri?.date ?? "",
      timezone: meta?.timezone ?? "UTC",
      method,
      lat,
      lng,
    };

    // Store in cache
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CACHE_TTL_HOURS);

    await cFromEdge(supabase, "prayer_times_cache").upsert({
      cache_key: cacheId,
      prayer_data: result,
      expires_at: expiresAt.toISOString(),
      lat: cacheKeyLat,
      lng: cacheKeyLng,
      date: today,
    });

    return new Response(
      JSON.stringify({ data: result, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[prayer-times]", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
