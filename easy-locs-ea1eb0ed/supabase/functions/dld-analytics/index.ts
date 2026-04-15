import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-endpoint, x-params",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const endpoint = req.headers.get("x-endpoint") || url.pathname.split("/").pop();
    const xParams = req.headers.get("x-params");
    const params = xParams
      ? Object.fromEntries(new URLSearchParams(xParams))
      : Object.fromEntries(url.searchParams);

    const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("authorization") || `Bearer ${supabaseAnonKey}`;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { authorization: authHeader } },
    });

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

    switch (endpoint) {
      case "kpis": {
        const { data: rows } = await baseQuery();
        if (!rows || rows.length === 0) {
          return new Response(JSON.stringify({ error: "no_data" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const period = params.period || "2026-04";
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
        const { data: rows } = await baseQuery();
        if (!rows) { data = []; break; }

        const period = params.period || "2026-04";
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
          };
        }).sort((a: { transactionCount: number }, b: { transactionCount: number }) => b.transactionCount - a.transactionCount);
        break;
      }

      case "trends": {
        const { data: tRows } = await baseQuery();
        if (!tRows) { data = []; break; }

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
        const { data: txRows } = await baseQuery().order("amount", { ascending: false }).limit(500);
        data = (txRows || []).map((r: Record<string, unknown>) => ({
          id: r.id,
          transactionId: r.transaction_id,
          district: r.district,
          propertyType: r.property_type,
          transactionType: r.transaction_type,
          amount: Number(r.amount),
          areaSqft: Number(r.area_sqft),
          pricePerSqft: Number(r.price_per_sqft),
          bedrooms: r.bedrooms || null,
          buildingName: r.building_name || null,
          developer: r.developer || null,
          transactionDate: r.transaction_date,
          area: r.district,
          currency: "AED",
          isFreehold: true,
          buyerNationality: r.buyer_nationality || null,
          createdAt: r.created_at || r.transaction_date,
        }));
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
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "MISS" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
