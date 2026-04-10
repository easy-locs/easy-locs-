/**
 * Module Health Reporter — Reports engine health to module_health table.
 * Bridges client-side engine execution to persistent DB observability.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

type ModuleKey = "orbit" | "wallet" | "scanner" | "checkout" | "radar" | "delivery" | "deep_scrape" | "publish_pipeline" | "notifications" | "realtime" | "chat" | "payments";

export async function reportModuleHealth(
  module: ModuleKey,
  status: "ok" | "degraded" | "error",
  latencyMs?: number,
  incident?: string
) {
  const now = new Date().toISOString();
  const update: Record<string, any> = {
    status,
    updated_at: now,
  };

  if (status === "ok") {
    update.last_success_at = now;
    update.current_incident = null;
  } else {
    update.last_error_at = now;
    if (incident) update.current_incident = incident;
  }

  if (latencyMs !== undefined) {
    update.p95_latency_ms = latencyMs;
  }

  await db
    .from("module_health")
    .update(update)
    .eq("module", module)
    .catch(() => {});
}

export async function incrementErrorCount(module: ModuleKey) {
  // Use RPC-like update — increment error_count_1h
  const { data } = await db
    .from("module_health")
    .select("error_count_1h")
    .eq("module", module)
    .maybeSingle();

  if (data) {
    await db
      .from("module_health")
      .update({ error_count_1h: (data.error_count_1h ?? 0) + 1, updated_at: new Date().toISOString() })
      .eq("module", module);
  }
}

export async function getModuleHealthSnapshot() {
  const { data } = await db
    .from("module_health")
    .select("*")
    .order("module");
  return data ?? [];
}
