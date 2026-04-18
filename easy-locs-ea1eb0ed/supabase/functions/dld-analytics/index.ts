import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";
import {
  isDLDApiConfigured,
} from "../_shared/dld-api-client.ts";
import {
  syncDLDData,
  tryLiveDLDFetch,
  backfillHistoricalData,
  getLastSyncTimestamp,
  SYNC_COOLDOWN_MS,
  BACKFILL_DEFAULT_MONTHS,
} from "../_shared/dld-sync.ts";

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { data: unknown; ts: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL_MS) return entry.data as T;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, ts: Date.now() });
}

function matchesPeriod(dateStr: string, period: string): boolean {
  if (period.includes("Q")) {
    const [year, q] = period.split("-Q");
    const qNum = parseInt(q);
    const month = parseInt(dateStr.slice(5, 7));
    if (dateStr.slice(0, 4) !== year) return false;
    if (qNum === 1) return month >= 1 && month <= 3;
    if (qNum === 2) return month >= 4 && month <= 6;
    if (qNum === 3) return month >= 7 && month <= 9;
    return month >= 10 && month <= 12;
  }
  return dateStr.startsWith(period);
}

function getPreviousPeriod(period: string): string {
  if (period.includes("Q")) {
    const [year, q] = period.split("-Q");
    const qNum = parseInt(q);
    if (qNum === 1) return `${parseInt(year) - 1}-Q4`;
    return `${year}-Q${qNum - 1}`;
  }
  if (period.length === 4) return `${parseInt(period) - 1}`;
  const [yr, mo] = period.split("-").map(Number);
  if (mo === 1) return `${yr - 1}-12`;
  return `${yr}-${String(mo - 1).padStart(2, "0")}`;
}

const DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
  "Dubai Marina": { lat: 25.0804, lng: 55.1403 },
  "Downtown Dubai": { lat: 25.1972, lng: 55.2744 },
  "Business Bay": { lat: 25.1860, lng: 55.2621 },
  "Palm Jumeirah": { lat: 25.1124, lng: 55.1390 },
  "JVC": { lat: 25.0555, lng: 55.2107 },
  "JLT": { lat: 25.0763, lng: 55.1464 },
  "Dubai Hills": { lat: 25.1063, lng: 55.2388 },
  "Arabian Ranches": { lat: 25.0609, lng: 55.2707 },
  "DIFC": { lat: 25.2102, lng: 55.2797 },
  "Jumeirah Beach Residence": { lat: 25.0783, lng: 55.1336 },
  "Dubai Creek Harbour": { lat: 25.2050, lng: 55.3450 },
  "MBR City": { lat: 25.1700, lng: 55.3100 },
  "Damac Hills": { lat: 25.0190, lng: 55.2470 },
  "Al Barsha": { lat: 25.1090, lng: 55.2000 },
  "International City": { lat: 25.1567, lng: 55.4067 },
};


function mapRowToTransaction(r: Record<string, unknown>) {
  return {
    id: r.id,
    transactionId: r.transaction_id,
    district: r.district,
    propertyType: r.property_type,
    transactionType: r.transaction_type,
    amount: Number(r.amount),
    areaSqft: Number(r.area_sqft),
    pricePerSqft: Number(r.price_per_sqft),
    bedrooms: r.bedrooms ?? null,
    buildingName: r.building_name || null,
    developer: r.developer || null,
    transactionDate: r.transaction_date,
    area: r.district,
    currency: "AED",
    isFreehold: true,
    buyerNationality: r.buyer_nationality || null,
    createdAt: r.created_at || r.transaction_date,
  };
}

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-endpoint, x-params, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
  };

  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  try {
    const url = new URL(req.url);
    const endpoint = req.headers.get("x-endpoint") || url.pathname.split("/").pop();
    const xParams = req.headers.get("x-params");
    const params = xParams
      ? Object.fromEntries(new URLSearchParams(xParams))
      : Object.fromEntries(url.searchParams);

    const PRIVILEGED_ENDPOINTS = ["sync", "backfill", "backfill-status"];
    const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
    if (!PRIVILEGED_ENDPOINTS.includes(endpoint as string)) {
      const cached = getCached(cacheKey);
      if (cached) {
        return new Response(JSON.stringify(cached), {
          headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT", "X-Data-Source": "cache" },
        });
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("authorization") || `Bearer ${supabaseAnonKey}`;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { authorization: authHeader } },
    });

    const adminSupabase = serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey)
      : supabase;

    const baseQuery = () => {
      const q = supabase
        .schema("analytics")
        .from("dld_transactions")
        .select("id, transaction_id, district, property_type, transaction_type, amount, area_sqft, price_per_sqft, bedrooms, building_name, developer, transaction_date, buyer_nationality, created_at");
      if (params.district) q.eq("district", params.district);
      if (params.propertyType) q.eq("property_type", params.propertyType);
      if (params.minPrice) q.gte("amount", params.minPrice);
      if (params.maxPrice) q.lte("amount", params.maxPrice);
      return q;
    };

    let data: unknown;
    let dataSource = "database";

    switch (endpoint) {
      case "sync": {
        if (!serviceRoleKey) {
          return new Response(JSON.stringify({ error: "sync requires service role" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const incomingAuth = req.headers.get("authorization") || "";
        if (!incomingAuth.includes(serviceRoleKey)) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const syncResult = await syncDLDData(adminSupabase, {
          fromDate: params.fromDate,
          toDate: params.toDate,
          fullSync: params.fullSync === "true",
        });
        data = {
          ...syncResult,
          configured: isDLDApiConfigured(),
          timestamp: new Date().toISOString(),
        };
        dataSource = syncResult.source;
        break;
      }

      case "backfill": {
        if (!serviceRoleKey) {
          return new Response(JSON.stringify({ error: "backfill requires service role" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const incomingAuthBf = req.headers.get("authorization") || "";
        let backfillAuthorized = incomingAuthBf === `Bearer ${serviceRoleKey}`;
        if (!backfillAuthorized && incomingAuthBf.startsWith("Bearer ")) {
          const token = incomingAuthBf.replace("Bearer ", "");
          const { data: userData } = await supabase.auth.getUser(token);
          if (userData?.user) {
            const { data: isAdmin } = await adminSupabase.rpc("has_role", {
              _user_id: userData.user.id,
              _role: "admin",
            });
            backfillAuthorized = !!isAdmin;
          }
        }
        if (!backfillAuthorized) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!isDLDApiConfigured()) {
          return new Response(JSON.stringify({ error: "DLD API not configured", configured: false }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const monthsParam = Number(params.months) || BACKFILL_DEFAULT_MONTHS;

        console.log(`Starting historical backfill: ${monthsParam} months`);

        const backfillResult = await backfillHistoricalData(adminSupabase, {
          months: monthsParam,
        });

        data = {
          ...backfillResult,
          configured: true,
          timestamp: new Date().toISOString(),
        };
        dataSource = "dld_api_backfill";
        break;
      }

      case "backfill-status": {
        const { data: logs } = await supabase
          .schema("analytics")
          .from("dld_backfill_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(Number(params.limit) || 10);

        const { count: txCount } = await supabase
          .schema("analytics")
          .from("dld_transactions")
          .select("id", { count: "exact", head: true });

        const { data: dateRange } = await supabase
          .schema("analytics")
          .from("dld_transactions")
          .select("transaction_date")
          .order("transaction_date", { ascending: true })
          .limit(1);

        const { data: dateRangeMax } = await supabase
          .schema("analytics")
          .from("dld_transactions")
          .select("transaction_date")
          .order("transaction_date", { ascending: false })
          .limit(1);

        data = {
          totalRecords: txCount || 0,
          oldestTransaction: dateRange?.[0]?.transaction_date || null,
          newestTransaction: dateRangeMax?.[0]?.transaction_date || null,
          backfillRuns: logs || [],
        };
        dataSource = "backfill_status";
        break;
      }

      case "status": {
        const { count } = await supabase
          .schema("analytics")
          .from("dld_transactions")
          .select("id", { count: "exact", head: true });

        const { data: latestRow } = await supabase
          .schema("analytics")
          .from("dld_transactions")
          .select("transaction_date, created_at")
          .order("transaction_date", { ascending: false })
          .limit(1);

        const latestDate = latestRow?.[0]?.transaction_date || null;
        const latestSync = latestRow?.[0]?.created_at || null;

        const { data: lastSyncRow } = await supabase
          .schema("analytics")
          .from("dld_sync_log")
          .select("started_at, status, affected, errors")
          .order("created_at", { ascending: false })
          .limit(1);

        const lastSyncLog = lastSyncRow?.[0] || null;
        const inMemoryTs = getLastSyncTimestamp();

        data = {
          configured: isDLDApiConfigured(),
          totalRecords: count || 0,
          latestTransactionDate: latestDate,
          latestSyncTimestamp: latestSync,
          lastSyncAttempt: lastSyncLog?.started_at
            || (inMemoryTs > 0 ? new Date(inMemoryTs).toISOString() : null),
          lastSyncStatus: lastSyncLog?.status || null,
          lastSyncAffected: lastSyncLog?.affected ?? null,
          lastSyncErrors: lastSyncLog?.errors ?? null,
          syncCooldownMs: SYNC_COOLDOWN_MS,
        };
        dataSource = "status";
        break;
      }

      case "kpis": {
        const liveFetched = await tryLiveDLDFetch(adminSupabase, {
          fromDate: params.period ? `${params.period}-01` : undefined,
        });

        const { data: rows } = await baseQuery();
        if (!rows || rows.length === 0) {
          return new Response(JSON.stringify({ error: "no_data" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json", "X-Data-Source": "none" },
          });
        }

        dataSource = liveFetched ? "live" : "database";
        const period = params.period || new Date().toISOString().slice(0, 7);
        const prevPeriod = getPreviousPeriod(period);
        const currentTx = rows.filter((r: { transaction_date: string }) => matchesPeriod(r.transaction_date, period));
        const prevTx = rows.filter((r: { transaction_date: string }) => matchesPeriod(r.transaction_date, prevPeriod));

        const totalTransactions = currentTx.length;
        const totalVolume = currentTx.reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0);
        const avgPricePerSqft = totalTransactions > 0
          ? Math.round(currentTx.reduce((s: number, r: { price_per_sqft: number }) => s + Number(r.price_per_sqft), 0) / totalTransactions)
          : 0;
        const prevAvg = prevTx.length > 0
          ? Math.round(prevTx.reduce((s: number, r: { price_per_sqft: number }) => s + Number(r.price_per_sqft), 0) / prevTx.length)
          : avgPricePerSqft;
        const changeVsPrevious = prevAvg > 0 ? Math.round(((avgPricePerSqft - prevAvg) / prevAvg) * 1000) / 10 : 0;

        data = { totalTransactions, totalVolume, avgPricePerSqft, period, changeVsPrevious };
        break;
      }

      case "districts": {
        const liveFetchedDistricts = await tryLiveDLDFetch(adminSupabase);

        const { data: rows } = await baseQuery();
        if (!rows) { data = []; break; }

        dataSource = liveFetchedDistricts ? "live" : "database";
        const period = params.period || new Date().toISOString().slice(0, 7);
        const prevPeriod = getPreviousPeriod(period);
        const currentTx = rows.filter((r: { transaction_date: string }) => matchesPeriod(r.transaction_date, period));
        const prevTx = rows.filter((r: { transaction_date: string }) => matchesPeriod(r.transaction_date, prevPeriod));

        const byDistrict = new Map<string, typeof currentTx>();
        for (const r of currentTx) {
          if (!byDistrict.has(r.district)) byDistrict.set(r.district, []);
          byDistrict.get(r.district)!.push(r);
        }
        const prevByDistrict = new Map<string, typeof prevTx>();
        for (const r of prevTx) {
          if (!prevByDistrict.has(r.district)) prevByDistrict.set(r.district, []);
          prevByDistrict.get(r.district)!.push(r);
        }

        data = Array.from(byDistrict.entries()).map(([district, txs]) => {
          const typeCount = new Map<string, number>();
          for (const tx of txs) {
            typeCount.set(tx.property_type, (typeCount.get(tx.property_type) || 0) + 1);
          }
          let dominantType = "apartment";
          let maxCount = 0;
          for (const [type, count] of typeCount) {
            if (count > maxCount) { maxCount = count; dominantType = type; }
          }
          const avgPrice = Math.round(txs.reduce((s: number, t: { price_per_sqft: number }) => s + Number(t.price_per_sqft), 0) / txs.length);
          const pTxs = prevByDistrict.get(district) || [];
          const prevAvg = pTxs.length > 0 ? Math.round(pTxs.reduce((s: number, t: { price_per_sqft: number }) => s + Number(t.price_per_sqft), 0) / pTxs.length) : avgPrice;
          const changePercent = prevAvg > 0 ? Math.round(((avgPrice - prevAvg) / prevAvg) * 1000) / 10 : 0;

          const typeBreakdown = [...typeCount.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => ({
              type,
              count,
              pct: txs.length > 0 ? Math.round((count / txs.length) * 100) : 0,
            }));

          const coords = DISTRICT_COORDS[district] || { lat: 25.2, lng: 55.27 };
          return {
            district,
            transactionCount: txs.length,
            totalAmount: txs.reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0),
            avgPricePerSqft: avgPrice,
            dominantType,
            changePercent,
            lat: coords.lat,
            lng: coords.lng,
            typeBreakdown,
          };
        }).sort((a: { transactionCount: number }, b: { transactionCount: number }) => b.transactionCount - a.transactionCount);
        break;
      }

      case "trends": {
        const liveFetchedTrends = await tryLiveDLDFetch(adminSupabase);

        const { data: tRows } = await baseQuery();
        if (!tRows) { data = []; break; }

        dataSource = liveFetchedTrends ? "live" : "database";
        const districtFilter = params.districts ? params.districts.split(",") : null;
        const filteredRows = districtFilter
          ? tRows.filter((r: { district: string }) => districtFilter.includes(r.district))
          : tRows;

        const monthDistrictMap = new Map<string, { count: number; volume: number; priceSum: number }>();
        for (const r of filteredRows) {
          const month = (r.transaction_date as string).slice(0, 7);
          const key = `${month}::${r.district}`;
          const entry = monthDistrictMap.get(key) || { count: 0, volume: 0, priceSum: 0 };
          entry.count++;
          entry.volume += Number(r.amount);
          entry.priceSum += Number(r.price_per_sqft);
          monthDistrictMap.set(key, entry);
        }

        data = Array.from(monthDistrictMap.entries()).map(([key, v]) => {
          const [month, district] = key.split("::");
          return {
            month,
            district,
            avgPricePerSqft: Math.round(v.priceSum / v.count),
            transactionCount: v.count,
            totalVolume: v.volume,
          };
        });
        break;
      }

      case "transactions": {
        const liveFetchedTx = await tryLiveDLDFetch(adminSupabase, {
          area: params.district,
        });

        const parsedOffset = Number(params.offset);
        const parsedLimit = Number(params.limit);
        const txOffset = Math.max(0, Math.floor(Number.isFinite(parsedOffset) ? parsedOffset : 0));
        const txLimit = Math.min(500, Math.max(1, Math.floor(Number.isFinite(parsedLimit) ? parsedLimit : 20)));

        const countQuery = supabase
          .schema("analytics")
          .from("dld_transactions")
          .select("id", { count: "exact", head: true });
        if (params.district) countQuery.eq("district", params.district);
        if (params.propertyType) countQuery.eq("property_type", params.propertyType);
        if (params.minPrice) countQuery.gte("amount", params.minPrice);
        if (params.maxPrice) countQuery.lte("amount", params.maxPrice);
        const { count: txTotal } = await countQuery;
        const total = txTotal ?? 0;
        const safeOffset = Math.min(txOffset, Math.max(0, total));

        const { data: txRows } = await baseQuery()
          .order("amount", { ascending: false })
          .range(safeOffset, safeOffset + txLimit - 1);

        dataSource = liveFetchedTx ? "live" : "database";
        data = {
          data: (txRows || []).map(mapRowToTransaction),
          total,
          offset: safeOffset,
          limit: txLimit,
        };
        break;
      }

      case "top-transactions": {
        const liveFetchedTop = await tryLiveDLDFetch(adminSupabase);

        const limit = Number(params.limit) || 10;
        let topQuery = supabase
          .schema("analytics")
          .from("dld_transactions")
          .select("id, transaction_id, district, property_type, transaction_type, amount, area_sqft, price_per_sqft, bedrooms, building_name, developer, transaction_date, buyer_nationality, created_at")
          .order("amount", { ascending: false })
          .limit(limit);
        if (params.propertyType) topQuery = topQuery.eq("property_type", params.propertyType);
        if (params.district) topQuery = topQuery.eq("district", params.district);
        if (params.minPrice) topQuery = topQuery.gte("amount", params.minPrice);
        if (params.maxPrice) topQuery = topQuery.lte("amount", params.maxPrice);
        if (params.transactionType) topQuery = topQuery.eq("transaction_type", params.transactionType);

        const { data: topRows } = await topQuery;
        dataSource = liveFetchedTop ? "live" : "database";
        data = (topRows || []).map(mapRowToTransaction);
        break;
      }

      case "building-history": {
        const buildingName = params.building;
        if (!buildingName) {
          return new Response(JSON.stringify({ error: "building parameter required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const q = supabase
          .schema("analytics")
          .from("dld_transactions")
          .select("id, transaction_id, district, property_type, transaction_type, amount, area_sqft, price_per_sqft, bedrooms, building_name, developer, transaction_date, buyer_nationality, created_at")
          .eq("building_name", buildingName)
          .eq("transaction_type", "sale")
          .order("transaction_date", { ascending: true })
          .limit(2000);
        const { data: bhRows } = await q;
        dataSource = "database";
        data = (bhRows || []).map(mapRowToTransaction);
        break;
      }

      case "comparables": {
        const compDistrict = params.district;
        if (!compDistrict) {
          return new Response(JSON.stringify({ error: "district parameter required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const liveFetchedComp = await tryLiveDLDFetch(adminSupabase, { area: compDistrict });

        let compQuery = supabase
          .schema("analytics")
          .from("dld_transactions")
          .select("id, transaction_id, district, property_type, transaction_type, amount, area_sqft, price_per_sqft, bedrooms, building_name, developer, transaction_date, buyer_nationality, created_at")
          .eq("district", compDistrict)
          .eq("transaction_type", "sale")
          .order("transaction_date", { ascending: false })
          .limit(Number(params.limit) || 20);
        if (params.type) compQuery = compQuery.eq("property_type", params.type);
        if (params.bedrooms !== undefined && params.bedrooms !== null && params.bedrooms !== "") compQuery = compQuery.eq("bedrooms", Number(params.bedrooms));
        const { data: compRows } = await compQuery;
        const comps = (compRows || []).map(mapRowToTransaction);
        const compPrices = comps.map((c: { pricePerSqft: number }) => c.pricePerSqft).sort((a: number, b: number) => a - b);
        const medianPricePerSqft = compPrices.length > 0
          ? compPrices[Math.floor(compPrices.length / 2)]
          : 0;
        dataSource = liveFetchedComp ? "live" : "database";
        data = { comparables: comps, medianPricePerSqft };
        break;
      }

      case "buildings": {
        let bQuery = supabase
          .schema("analytics")
          .from("dld_transactions")
          .select("building_name, district")
          .not("building_name", "is", null);
        if (params.district) bQuery = bQuery.eq("district", params.district);
        const { data: bRows } = await bQuery;
        const buildingSet = new Map<string, string>();
        for (const r of (bRows || [])) {
          if (r.building_name && !buildingSet.has(r.building_name)) {
            buildingSet.set(r.building_name, r.district);
          }
        }
        dataSource = "database";
        data = Array.from(buildingSet.entries()).map(([name, district]) => ({ name, district })).sort((a, b) => a.name.localeCompare(b.name));
        break;
      }

      case "summary": {
        const liveFetchedSummary = await tryLiveDLDFetch(adminSupabase);

        const { data: sumRows } = await supabase
          .schema("analytics")
          .from("dld_transactions")
          .select("district, amount, price_per_sqft, transaction_date");
        if (!sumRows || sumRows.length === 0) {
          data = { avgPricePerSqft: 0, totalVolume: 0, transactionCount: 0, volumeTrend: 0, hottestDistrict: "" };
          break;
        }
        dataSource = liveFetchedSummary ? "live" : "database";
        const sortedDates = sumRows.map((r: { transaction_date: string }) => r.transaction_date).sort();
        const latestDate = sortedDates[sortedDates.length - 1];
        const currentMonth = latestDate.slice(0, 7);
        const prevDate = new Date(currentMonth + "-01");
        prevDate.setMonth(prevDate.getMonth() - 1);
        const prevMonth = prevDate.toISOString().slice(0, 7);
        const curTx = sumRows.filter((r: { transaction_date: string }) => r.transaction_date.startsWith(currentMonth));
        const prvTx = sumRows.filter((r: { transaction_date: string }) => r.transaction_date.startsWith(prevMonth));
        const sumAvg = curTx.length > 0
          ? Math.round(curTx.reduce((s: number, r: { price_per_sqft: number }) => s + Number(r.price_per_sqft), 0) / curTx.length)
          : 0;
        const sumVol = curTx.reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0);
        const prvVol = prvTx.reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0);
        const volTrend = prvVol > 0 ? Math.round(((sumVol - prvVol) / prvVol) * 100) : 0;
        const dCounts = new Map<string, number>();
        for (const r of curTx) { dCounts.set(r.district, (dCounts.get(r.district) || 0) + 1); }
        let hottest = "";
        let hotMax = 0;
        for (const [d, c] of dCounts) { if (c > hotMax) { hotMax = c; hottest = d; } }
        data = { avgPricePerSqft: sumAvg, totalVolume: sumVol, transactionCount: curTx.length, volumeTrend: volTrend, hottestDistrict: hottest };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "unknown_endpoint" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    setCache(cacheKey, data);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "MISS", "X-Data-Source": dataSource },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
