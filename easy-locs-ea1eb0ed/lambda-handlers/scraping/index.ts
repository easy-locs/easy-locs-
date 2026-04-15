import type { SQSEvent, SQSHandler } from "aws-lambda";

interface ScrapingPayload {
  _job_id?: string;
  _correlation_id?: string;
  _queue_name?: string;
  _from_queue?: boolean;
  _source?: string;
  target_url?: string;
  engine?: string;
  region?: string;
}

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || "";

async function updateJobStatus(jobId: string, status: string, error?: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !jobId) return;
  const body: Record<string, string> = { status, completed_at: new Date().toISOString() };
  if (error) body.error = error;
  await fetch(`${SUPABASE_URL}/rest/v1/job_queue?id=eq.${jobId}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
}

async function scrapeUrl(url: string): Promise<Record<string, unknown>> {
  if (!FIRECRAWL_API_KEY) {
    throw new Error("FIRECRAWL_API_KEY not configured in Lambda environment");
  }

  const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown", "html"],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Firecrawl scrape failed ${response.status}: ${errText}`);
  }

  return response.json();
}

async function runDiscoveryFlow(payload: ScrapingPayload): Promise<Record<string, unknown>> {
  const source = payload._source || "deliveroo-dubai-food";
  const handler = source === "deliveroo-dubai-food" ? "deliveroo-dubai-food" : source;

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${handler}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...payload, _from_queue: true }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Discovery flow ${handler} returned ${response.status}: ${errText}`);
  }

  return response.json();
}

async function storeScrapeResult(payload: ScrapingPayload, result: Record<string, unknown>): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/merchant_scrape_results`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      source: payload._source || "deliveroo-dubai-food",
      url: payload.target_url,
      region: payload.region || "dubai",
      raw_data: result,
      status: "scraped",
      scraped_at: new Date().toISOString(),
    }),
  }).catch((e) => {
    console.error("[scraping] Failed to store result:", e);
  });
}

export const handler: SQSHandler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    const payload: ScrapingPayload = JSON.parse(record.body);
    const jobId = payload._job_id || "";

    try {
      if (payload.target_url) {
        const result = await scrapeUrl(payload.target_url);
        await storeScrapeResult(payload, result);
        console.log(`[scraping] Completed single-URL scrape job ${jobId}: ${payload.target_url}`);
      } else {
        const result = await runDiscoveryFlow(payload);
        console.log(`[scraping] Completed discovery flow job ${jobId}:`, JSON.stringify(result).slice(0, 200));
      }

      await updateJobStatus(jobId, "completed");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[scraping] Failed job ${jobId}:`, message);
      await updateJobStatus(jobId, "dead", message);
      throw err;
    }
  }
};
