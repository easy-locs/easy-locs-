import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";

interface ConnectivityCheck {
  service: string;
  status: "ok" | "degraded" | "down";
  latencyMs: number;
  details?: string;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise
      .then((result) => { clearTimeout(timer); resolve(result); })
      .catch((err) => { clearTimeout(timer); reject(err); });
  });
}

export async function runBackendConnectivityCheck(timeoutMs = 5000) {
  const checks: ConnectivityCheck[] = [];

  const dbCheck = await checkSupabaseDb(timeoutMs);
  checks.push(dbCheck);

  const authCheck = await checkSupabaseAuth(timeoutMs);
  checks.push(authCheck);

  const storageCheck = await checkSupabaseStorage(timeoutMs);
  checks.push(storageCheck);

  const edgeFnCheck = await checkEdgeFunctions(timeoutMs);
  checks.push(edgeFnCheck);

  const overallOk = checks.every(c => c.status === "ok");
  const hasDegraded = checks.some(c => c.status === "degraded");

  const overallStatus = overallOk ? "healthy" : hasDegraded ? "degraded" : "unhealthy";

  platformBus.emit("system:module_status_changed", {
    engine: "backend-connectivity",
    status: overallStatus,
    services: checks.map(c => ({ service: c.service, status: c.status })),
  }, "engine");

  return {
    status: overallStatus,
    results: checks,
    healthy: checks.filter(c => c.status === "ok").length,
    degraded: checks.filter(c => c.status === "degraded").length,
    down: checks.filter(c => c.status === "down").length,
  };
}

async function checkSupabaseDb(timeoutMs: number): Promise<ConnectivityCheck> {
  const start = performance.now();
  try {
    const { error } = await withTimeout(
      supabase.from("seed_merchants").select("id").limit(1),
      timeoutMs,
      "supabase-db",
    );

    const latency = Math.round(performance.now() - start);

    if (error) {
      return { service: "supabase-db", status: "degraded", latencyMs: latency, details: error.message };
    }
    return { service: "supabase-db", status: latency > 3000 ? "degraded" : "ok", latencyMs: latency };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "unknown";
    return { service: "supabase-db", status: "down", latencyMs: Math.round(performance.now() - start), details: message };
  }
}

async function checkSupabaseAuth(timeoutMs: number): Promise<ConnectivityCheck> {
  const start = performance.now();
  try {
    const { error } = await withTimeout(
      supabase.auth.getSession(),
      timeoutMs,
      "supabase-auth",
    );

    const latency = Math.round(performance.now() - start);

    if (error) {
      return { service: "supabase-auth", status: "degraded", latencyMs: latency, details: error.message };
    }
    return { service: "supabase-auth", status: latency > 3000 ? "degraded" : "ok", latencyMs: latency };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "unknown";
    return { service: "supabase-auth", status: "down", latencyMs: Math.round(performance.now() - start), details: message };
  }
}

async function checkSupabaseStorage(timeoutMs: number): Promise<ConnectivityCheck> {
  const start = performance.now();
  try {
    const { error } = await withTimeout(
      supabase.storage.listBuckets(),
      timeoutMs,
      "supabase-storage",
    );

    const latency = Math.round(performance.now() - start);

    if (error) {
      return { service: "supabase-storage", status: "degraded", latencyMs: latency, details: error.message };
    }
    return { service: "supabase-storage", status: latency > 3000 ? "degraded" : "ok", latencyMs: latency };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "unknown";
    return { service: "supabase-storage", status: "down", latencyMs: Math.round(performance.now() - start), details: message };
  }
}

async function checkEdgeFunctions(timeoutMs: number): Promise<ConnectivityCheck> {
  const start = performance.now();
  try {
    const { error } = await withTimeout(
      supabase.functions.invoke("health-check", { body: { ping: true } }),
      timeoutMs,
      "supabase-edge-functions",
    );

    const latency = Math.round(performance.now() - start);

    if (error) {
      const msg = typeof error === "object" && "message" in error ? error.message : String(error);
      const isNotFound = msg.includes("not found") || msg.includes("404") || msg.includes("NOT_FOUND");
      if (isNotFound) {
        return { service: "supabase-edge-functions", status: "degraded", latencyMs: latency, details: "health-check function not deployed; edge runtime reachable" };
      }
      return { service: "supabase-edge-functions", status: "degraded", latencyMs: latency, details: msg };
    }

    return { service: "supabase-edge-functions", status: latency > 3000 ? "degraded" : "ok", latencyMs: latency };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "unknown";
    return { service: "supabase-edge-functions", status: "down", latencyMs: Math.round(performance.now() - start), details: message };
  }
}
