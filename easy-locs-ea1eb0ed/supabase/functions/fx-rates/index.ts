/**
 * fx-rates — FX Rate Service for LOCS Wallet
 * Primary: ECB (European Central Bank) XML feed — free, no key
 * Optional: Fixer API (if FIXER_API_KEY is set)
 * Caches rates in fx_rates_cache table (1h TTL)
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ECB_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
const FIXER_URL = "https://data.fixer.io/api/latest";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const PLATFORM_SPREAD = 0.02; // 2% spread on FX conversion

async function fetchECBRates(): Promise<Record<string, number>> {
  const res = await fetch(ECB_URL);
  if (!res.ok) throw new Error(`ECB fetch failed: ${res.status}`);
  const xml = await res.text();

  const rates: Record<string, number> = { EUR: 1 };
  const regex = /currency='([A-Z]+)'\s+rate='([0-9.]+)'/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    rates[match[1]] = parseFloat(match[2]);
  }
  return rates;
}

async function fetchFixerRates(apiKey: string): Promise<Record<string, number>> {
  const res = await fetch(`${FIXER_URL}?access_key=${apiKey}&base=EUR`);
  if (!res.ok) throw new Error(`Fixer fetch failed: ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error(`Fixer error: ${JSON.stringify(data.error)}`);
  return { EUR: 1, ...data.rates };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    // Check cache first
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
    } else {
      // Fetch fresh rates
      const fixerKey = Deno.env.get("FIXER_API_KEY");
      try {
        if (fixerKey) {
          rates = await fetchFixerRates(fixerKey);
          source = "fixer";
        } else {
          rates = await fetchECBRates();
          source = "ecb";
        }
      } catch (primaryErr) {
        console.error("Primary FX source failed:", primaryErr);
        // Fallback
        try {
          rates = await fetchECBRates();
          source = "ecb_fallback";
        } catch {
          return new Response(JSON.stringify({ error: "All FX sources unavailable" }), {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      fetchedAt = new Date().toISOString();

      // Cache rates
      await supabase.from("fx_rates_cache").insert({
        base_currency: "EUR",
        rates_json: rates,
        source,
        fetched_at: fetchedAt,
        expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
      });
    }

    if (action === "convert" && amount > 0) {
      // Convert: fromCurrency → EUR → LOCS (with spread)
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

    // Default: return all rates
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
