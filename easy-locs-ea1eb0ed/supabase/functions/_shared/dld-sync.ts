import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cFromEdge, cRpcEdge } from "./execution/content-mutation.ts";
import {
  fetchDLDTransactions,
  isDLDApiConfigured,
  type NormalizedDLDTransaction,
} from "./dld-api-client.ts";

const SYNC_BATCH_SIZE = 500;
const SYNC_MAX_PAGES = 20;

let lastSyncTimestamp = 0;
const SYNC_COOLDOWN_MS = 10 * 60 * 1000;

export { SYNC_COOLDOWN_MS, lastSyncTimestamp };

export interface SyncResult {
  affected: number;
  errors: number;
  source: string;
}

export async function syncDLDData(
  supabase: ReturnType<typeof createClient>,
  options: { fromDate?: string; toDate?: string; fullSync?: boolean } = {},
): Promise<SyncResult> {
  if (!isDLDApiConfigured()) {
    return { affected: 0, errors: 0, source: "not_configured" };
  }

  const now = Date.now();
  if (!options.fullSync && now - lastSyncTimestamp < SYNC_COOLDOWN_MS) {
    return { affected: 0, errors: 0, source: "cooldown" };
  }

  let affected = 0;
  let errors = 0;
  let offset = 0;

  for (let page = 0; page < SYNC_MAX_PAGES; page++) {
    try {
      const result = await fetchDLDTransactions({
        limit: SYNC_BATCH_SIZE,
        offset,
        fromDate: options.fromDate,
        toDate: options.toDate,
      });

      if (result.transactions.length === 0) break;

      const upsertResult = await upsertTransactions(supabase, result.transactions);
      affected += upsertResult.affected;
      errors += upsertResult.errors;

      if (!result.hasMore) break;
      offset += SYNC_BATCH_SIZE;
    } catch (err) {
      console.error(`DLD sync page ${page} failed:`, (err as Error).message);
      errors++;
      break;
    }
  }

  lastSyncTimestamp = now;
  return { affected, errors, source: "dld_api" };
}

export async function upsertTransactions(
  supabase: ReturnType<typeof createClient>,
  transactions: NormalizedDLDTransaction[],
): Promise<{ affected: number; errors: number }> {
  let affected = 0;
  let errors = 0;

  const batchSize = 100;
  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    const rows = batch.map((t) => ({
      transaction_id: t.transaction_id,
      district: t.district,
      property_type: t.property_type,
      transaction_type: t.transaction_type,
      amount: t.amount,
      area_sqft: t.area_sqft,
      price_per_sqft: t.price_per_sqft,
      bedrooms: t.bedrooms,
      building_name: t.building_name,
      developer: t.developer,
      buyer_nationality: t.buyer_nationality,
      transaction_date: t.transaction_date,
      registration_date: t.registration_date,
      metadata: t.metadata,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await cFromEdge(supabase.schema("analytics"), "dld_transactions")
      .upsert(rows, { onConflict: "transaction_id", ignoreDuplicates: false });

    if (error) {
      console.error("Upsert batch error:", error.message);
      errors += batch.length;
    } else {
      affected += batch.length;
    }
  }

  return { affected, errors };
}

export async function tryLiveDLDFetch(
  supabase: ReturnType<typeof createClient>,
  options: { fromDate?: string; toDate?: string; area?: string } = {},
): Promise<boolean> {
  if (!isDLDApiConfigured()) return false;

  try {
    const result = await fetchDLDTransactions({
      limit: SYNC_BATCH_SIZE,
      fromDate: options.fromDate,
      toDate: options.toDate,
      area: options.area,
    });

    if (result.transactions.length > 0) {
      await upsertTransactions(supabase, result.transactions);
      return true;
    }
    return false;
  } catch (err) {
    console.error("Live DLD fetch failed, using cached data:", (err as Error).message);
    return false;
  }
}

export function getLastSyncTimestamp(): number {
  return lastSyncTimestamp;
}

const BACKFILL_BATCH_SIZE = 500;
const BACKFILL_MAX_PAGES_PER_MONTH = 100;
export const BACKFILL_DEFAULT_MONTHS = 24;

export interface BackfillMonthResult {
  month: string;
  fromDate: string;
  toDate: string;
  fetched: number;
  upserted: number;
  errors: number;
  pages: number;
  skipped: boolean;
  truncated: boolean;
}

export interface BackfillResult {
  monthsProcessed: number;
  totalFetched: number;
  totalUpserted: number;
  totalErrors: number;
  truncatedMonths: number;
  months: BackfillMonthResult[];
  startDate: string;
  endDate: string;
  durationMs: number;
}

function getMonthRanges(months: number): { fromDate: string; toDate: string; label: string }[] {
  const ranges: { fromDate: string; toDate: string; label: string }[] = [];
  const now = new Date();

  for (let i = months; i >= 1; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const fromDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const toDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    const label = `${year}-${String(month + 1).padStart(2, "0")}`;
    ranges.push({ fromDate, toDate, label });
  }

  return ranges;
}

export async function backfillHistoricalData(
  supabase: ReturnType<typeof createClient>,
  options: { months?: number } = {},
): Promise<BackfillResult> {
  const startTime = Date.now();
  const months = Math.min(Math.max(options.months || BACKFILL_DEFAULT_MONTHS, 1), 36);
  const ranges = getMonthRanges(months);
  const results: BackfillMonthResult[] = [];
  let totalFetched = 0;
  let totalUpserted = 0;
  let totalErrors = 0;

  for (const range of ranges) {
    const monthResult: BackfillMonthResult = {
      month: range.label,
      fromDate: range.fromDate,
      toDate: range.toDate,
      fetched: 0,
      upserted: 0,
      errors: 0,
      pages: 0,
      skipped: false,
      truncated: false,
    };

    let offset = 0;
    let hitPageCap = false;
    for (let page = 0; page < BACKFILL_MAX_PAGES_PER_MONTH; page++) {
      try {
        const result = await fetchDLDTransactions({
          limit: BACKFILL_BATCH_SIZE,
          offset,
          fromDate: range.fromDate,
          toDate: range.toDate,
        });

        monthResult.pages++;
        monthResult.fetched += result.transactions.length;

        if (result.transactions.length === 0) break;

        const upsertResult = await upsertTransactions(supabase, result.transactions);
        monthResult.upserted += upsertResult.affected;
        monthResult.errors += upsertResult.errors;

        if (!result.hasMore) break;
        offset += BACKFILL_BATCH_SIZE;

        if (page === BACKFILL_MAX_PAGES_PER_MONTH - 1 && result.hasMore) {
          hitPageCap = true;
        }
      } catch (err) {
        console.error(`Backfill ${range.label} page ${page} failed:`, (err as Error).message);
        monthResult.errors++;
        break;
      }
    }

    if (hitPageCap) {
      monthResult.truncated = true;
      console.warn(`Backfill: ${range.label} hit page cap (${BACKFILL_MAX_PAGES_PER_MONTH} pages) — data may be incomplete`);
    }

    totalFetched += monthResult.fetched;
    totalUpserted += monthResult.upserted;
    totalErrors += monthResult.errors;
    results.push(monthResult);

    console.log(`Backfill: ${range.label} — fetched=${monthResult.fetched}, upserted=${monthResult.upserted}, errors=${monthResult.errors}, truncated=${monthResult.truncated}`);
  }

  const truncatedMonths = results.filter((r) => r.truncated).length;

  const backfillResult: BackfillResult = {
    monthsProcessed: results.length,
    totalFetched,
    totalUpserted,
    totalErrors,
    truncatedMonths,
    months: results,
    startDate: ranges[0]?.fromDate || "",
    endDate: ranges[ranges.length - 1]?.toDate || "",
    durationMs: Date.now() - startTime,
  };

  const logInsert = await cFromEdge(supabase.schema("analytics"), "dld_backfill_log")
    .insert({
      months_requested: months,
      months_processed: results.length,
      total_fetched: totalFetched,
      total_upserted: totalUpserted,
      total_errors: totalErrors,
      start_date: backfillResult.startDate,
      end_date: backfillResult.endDate,
      duration_ms: backfillResult.durationMs,
      month_details: results,
    });

  if (logInsert.error) {
    console.error("Failed to log backfill run:", logInsert.error.message);
  }

  return backfillResult;
}
