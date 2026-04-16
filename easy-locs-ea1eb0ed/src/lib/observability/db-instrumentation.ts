/**
 * Supabase / PostgREST query instrumentation.
 *
 * Wraps a thenable query (`db.from(...).select().eq(...)`) with an OTel span
 * that carries the standard `db.system`, `db.operation`, and `db.sql.table`
 * attributes. Also feeds RED metrics so slow queries surface in dashboards.
 *
 * Usage:
 *   const { data, error } = await instrumentQuery(
 *     "listings.select",
 *     "listings",
 *     "select",
 *     db.from("listings").select("*").eq("status", "active"),
 *   );
 */

import { startSpan } from "./trace-context";
import { recordRed } from "./red-metrics";
import { structuredLogger, type LogDomain } from "./structured-logger";

export async function instrumentQuery<T>(
  action: string,
  table: string,
  operation: "select" | "insert" | "update" | "upsert" | "delete" | "rpc",
  query: Promise<T>,
  options: { domain?: LogDomain } = {},
): Promise<T> {
  const span = startSpan(`db.${operation}`, {
    "db.system": "postgresql",
    "db.operation": operation,
    "db.sql.table": table,
  });
  const started = performance.now();
  let error = false;
  try {
    const result = await query;
    // Supabase returns `{ data, error }` — treat non-null error as failure.
    const maybeErr = (result as unknown as { error?: unknown })?.error;
    if (maybeErr) {
      error = true;
      span.span?.setAttribute("error", true);
    }
    return result;
  } catch (err) {
    error = true;
    span.span?.setAttribute("error", true);
    throw err;
  } finally {
    const duration_ms = Math.round(performance.now() - started);
    span.end();
    const domain: LogDomain = options.domain ?? "system";
    recordRed({
      domain,
      action: `db.${action}`,
      route: `${operation}:${table}`,
      duration_ms,
      error,
    });
    if (duration_ms > 1500) {
      structuredLogger.warn(domain, `db.${action}.slow`, `Slow ${operation} on ${table} (${duration_ms}ms)`, {
        duration_ms,
        result: error ? "failure" : "success",
      });
    }
  }
}
