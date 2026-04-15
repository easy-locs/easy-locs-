import type { SQSEvent, SQSHandler } from "aws-lambda";

interface AnalyticsPayload {
  _job_id?: string;
  _correlation_id?: string;
  _queue_name?: string;
  _from_queue?: boolean;
  _source?: string;
  job?: string;
  jobs?: string[];
}

interface AggregationResult {
  job_id: string;
  metric: string;
  value: number;
  computed_at: string;
}

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const ANALYTICS_QUERIES: Record<string, string> = {
  "occupancy-rate": "SELECT COUNT(*) FILTER (WHERE status = 'occupied')::float / NULLIF(COUNT(*), 0) AS value FROM properties",
  "revenue-mtd": "SELECT COALESCE(SUM(amount), 0) AS value FROM transactions WHERE created_at >= date_trunc('month', NOW())",
  "active-tenants": "SELECT COUNT(*) AS value FROM tenants WHERE status = 'active'",
  "overdue-payments": "SELECT COUNT(*) AS value FROM rent_payments WHERE status = 'overdue'",
  "maintenance-open": "SELECT COUNT(*) AS value FROM maintenance_requests WHERE status IN ('open', 'in_progress')",
};

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

async function runAggregation(jobName: string): Promise<AggregationResult> {
  const query = ANALYTICS_QUERIES[jobName];
  if (!query) {
    throw new Error(`Unknown analytics job: ${jobName}`);
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_readonly_query`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query_text: query }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Analytics query failed for ${jobName}: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const value = data?.[0]?.value ?? 0;

  return {
    job_id: jobName,
    metric: jobName,
    value: Number(value),
    computed_at: new Date().toISOString(),
  };
}

async function storeAggregationResults(results: AggregationResult[]): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/analytics_aggregations`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(results),
  }).catch((e) => {
    console.error("[analytics] Failed to store aggregation results:", e);
  });
}

export const handler: SQSHandler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    const payload: AnalyticsPayload = JSON.parse(record.body);
    const jobId = payload._job_id || "";

    try {
      const jobNames = payload.jobs || (payload.job ? [payload.job] : Object.keys(ANALYTICS_QUERIES));
      const results: AggregationResult[] = [];

      for (const jobName of jobNames) {
        try {
          const result = await runAggregation(jobName);
          results.push(result);
        } catch (err) {
          console.warn(`[analytics] Aggregation ${jobName} failed:`, err instanceof Error ? err.message : String(err));
        }
      }

      if (results.length > 0) {
        await storeAggregationResults(results);
      }

      await updateJobStatus(jobId, "completed");
      console.log(`[analytics] Completed job ${jobId}, ${results.length}/${jobNames.length} aggregations succeeded`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[analytics] Failed job ${jobId}:`, message);
      await updateJobStatus(jobId, "dead", message);
      throw err;
    }
  }
};
