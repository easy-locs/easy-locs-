import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const ECB_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
const FIXER_URL = "https://data.fixer.io/api/latest";
const EXCHANGE_RATE_API_URL = "https://open.er-api.com/v6/latest/EUR";
const CACHE_TTL_MS = 60 * 60 * 1000;
const PLATFORM_SPREAD = 0.02;
const FETCH_TIMEOUT_MS = 10_000;

const STATIC_FALLBACK_RATES: Record<string, number> = {
  EUR: 1, USD: 1.087, GBP: 0.855, MAD: 10.87, AED: 3.993, SAR: 4.076,
  EGP: 52.63, JPY: 161.29, CHF: 0.952, CAD: 1.471, AUD: 1.639,
  CNY: 7.874, INR: 90.91, KRW: 1449.28, SGD: 1.449, MYR: 4.762,
  THB: 38.46, PHP: 62.50, IDR: 17241.38, HKD: 8.475, BRL: 5.714,
  ZAR: 19.61, NGN: 1666.67, KES: 166.67, TRY: 35.71, NZD: 1.786,
  SEK: 11.24, NOK: 11.49, DKK: 7.463, PLN: 4.292,
};

function fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function fetchECBRates(): Promise<Record<string, number>> {
  console.log("[fx-rates] Fetching from ECB...");
  const res = await fetchWithTimeout(ECB_URL);
  if (!res.ok) throw new Error(`ECB fetch failed: ${res.status}`);
  const xml = await res.text();

  const rates: Record<string, number> = { EUR: 1 };
  const regex = /currency='([A-Z]+)'\s+rate='([0-9.]+)'/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    rates[match[1]] = parseFloat(match[2]);
  }
  console.log(`[fx-rates] ECB returned ${Object.keys(rates).length} currencies`);
  return rates;
}

async function fetchFixerRates(apiKey: string): Promise<Record<string, number>> {
  console.log("[fx-rates] Fetching from Fixer...");
  const res = await fetchWithTimeout(`${FIXER_URL}?access_key=${apiKey}&base=EUR`);
  if (!res.ok) throw new Error(`Fixer fetch failed: ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error(`Fixer error: ${JSON.stringify(data.error)}`);
  console.log(`[fx-rates] Fixer returned ${Object.keys(data.rates).length} currencies`);
  return { EUR: 1, ...data.rates };
}

async function fetchExchangeRateAPI(): Promise<Record<string, number>> {
  console.log("[fx-rates] Fetching from ExchangeRate-API...");
  const res = await fetchWithTimeout(EXCHANGE_RATE_API_URL);
  if (!res.ok) throw new Error(`ExchangeRate-API fetch failed: ${res.status}`);
  const data = await res.json();
  if (data.result !== "success" || !data.rates) throw new Error("ExchangeRate-API returned invalid data");
  console.log(`[fx-rates] ExchangeRate-API returned ${Object.keys(data.rates).length} currencies`);
  return data.rates;
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
    const action = url.searchParams.get("action") || "rates";
    const fromCurrency = url.searchParams.get("from") || "USD";
    const amount = parseFloat(url.searchParams.get("amount") || "0");

    const { data: cached } = await supabase
      .from("fx_rates_cache")
      .select("*")
      .gt("expires_at", new Date().toISOString())
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let rates: Record<string, number>;
    let source: string;
    let fetchedAt: string;

    if (cached && cached.rates_json && Object.keys(cached.rates_json as object).length > 5) {
      rates = cached.rates_json as Record<string, number>;
      source = cached.source;
      fetchedAt = cached.fetched_at;
      console.log(`[fx-rates] Using cached rates (source: ${source})`);
    } else {
      const fixerKey = Deno.env.get("FIXER_API_KEY");

      let fetched = false;

      try {
        rates = await fetchECBRates();
        source = "ecb";
        fetched = true;
      } catch (ecbErr) {
        console.error("[fx-rates] ECB failed:", ecbErr);
        rates = {} as Record<string, number>;
        source = "";
      }

      if (!fetched && fixerKey) {
        try {
          rates = await fetchFixerRates(fixerKey);
          source = "fixer";
          fetched = true;
        } catch (fixerErr) {
          console.error("[fx-rates] Fixer failed:", fixerErr);
        }
      }

      if (!fetched) {
        try {
          rates = await fetchExchangeRateAPI();
          source = "exchangerate-api";
          fetched = true;
        } catch (erApiErr) {
          console.error("[fx-rates] ExchangeRate-API failed:", erApiErr);
        }
      }

      if (!fetched) {
        console.error("[fx-rates] All FX sources unavailable");
        return new Response(JSON.stringify({ error: "All FX sources unavailable" }), {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      for (const [cur, rate] of Object.entries(STATIC_FALLBACK_RATES)) {
        if (!(cur in rates)) {
          rates[cur] = rate;
        }
      }

      fetchedAt = new Date().toISOString();
      console.log(`[fx-rates] Fresh rates fetched from ${source}, caching...`);

      await supabase.from("fx_rates_cache").insert({
        base_currency: "EUR",
        rates_json: rates,
        source,
        fetched_at: fetchedAt,
        expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
      });
    }

    if (action === "convert" && amount > 0) {
      const fromRate = rates[fromCurrency];
      if (!fromRate) {
        return new Response(JSON.stringify({ error: `Unsupported currency: ${fromCurrency}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const amountInEur = amount / fromRate;
      const spreadAmount = amountInEur * PLATFORM_SPREAD;
      const locsAmount = Math.floor((amountInEur - spreadAmount) * 100) / 100;

      return new Response(JSON.stringify({
        original_amount: amount,
        original_currency: fromCurrency,
        fx_rate_used: 1 / fromRate,
        amount_in_eur: Math.round(amountInEur * 100) / 100,
        margin_applied: PLATFORM_SPREAD,
        spread_amount: Math.round(spreadAmount * 100) / 100,
        locs_amount: locsAmount,
        fx_source: source,
        fx_timestamp: fetchedAt,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      base: "EUR",
      rates,
      source,
      fetched_at: fetchedAt!,
      spread: PLATFORM_SPREAD,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[fx-rates] Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
