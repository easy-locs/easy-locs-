/**
 * runAction — Canonical action executor for ALL domain operations.
 *
 * Every write operation (pay, send message, create order, etc.) MUST
 * flow through this function to ensure:
 *   1. Consistent error handling
 *   2. Platform bus event emission
 *   3. React Query cache invalidation
 *   4. Audit trail logging
 *   5. Flow tracing (runtime supervision)
 *   6. Health reporting
 *   7. Propagation validation
 *
 * Flow: UI → runAction() → Domain Service → DB → platformBus → UI refresh
 */

import { platformBus } from "@/lib/shared/platform-bus";
import type { PlatformEventType } from "@/lib/shared/platform-bus";
import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { startFlow, addStep, completeStep, failStep, endFlow } from "@/lib/runtime/flow-tracer";
import { reportHealth } from "@/lib/runtime/health-aggregator";
import { trackPropagation } from "@/lib/runtime/propagation-validator";

// Singleton query client reference — set once from App.tsx
let _queryClient: QueryClient | null = null;

export function setActionQueryClient(qc: QueryClient): void {
  _queryClient = qc;
}

export interface ActionConfig<T> {
  /** Human-readable action name for logging */
  name: string;
  /** Domain this action belongs to (for health reporting) */
  domain?: string;
  /** The actual async operation */
  execute: () => Promise<T>;
  /** Platform bus event to emit on success */
  event?: PlatformEventType;
  /** Event payload */
  eventPayload?: Record<string, unknown>;
  /** React Query keys to invalidate on success */
  invalidate?: string[];
  /** Called on success */
  onSuccess?: (result: T) => void;
  /** Called on error */
  onError?: (error: Error) => void;
  /** Show toast on error (default: true) */
  showErrorToast?: boolean;
  /** Show toast on success */
  successToast?: string;
}

export interface ActionResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * Execute a canonical action with full lifecycle management.
 */
export async function runAction<T>(config: ActionConfig<T>): Promise<ActionResult<T>> {
  const domain = config.domain || extractDomain(config.name);
  const flow = startFlow(domain, config.name);

  // ── Step 1: Execute ──
  const execStep = addStep(flow, "execute");
  try {
    const result = await config.execute();
    completeStep(flow, execStep);

    // ── Step 2: Emit platform event ──
    if (config.event) {
      const eventStep = addStep(flow, "event_emit");
      platformBus.emit(config.event, config.eventPayload ?? {}, domain as any);
      completeStep(flow, eventStep, { event: config.event });

      // Track propagation: event emitted, expect consumption
      trackPropagation({
        flowId: flow.flowId,
        domain,
        action: config.name,
        dbWriteSuccess: true,
        eventEmitted: config.event,
        cacheInvalidated: config.invalidate || [],
      });
    } else {
      // DB write without event — track for integrity validation
      trackPropagation({
        flowId: flow.flowId,
        domain,
        action: config.name,
        dbWriteSuccess: true,
        eventEmitted: null,
        cacheInvalidated: config.invalidate || [],
      });
    }

    // ── Step 3: Invalidate React Query caches ──
    if (_queryClient && config.invalidate?.length) {
      const cacheStep = addStep(flow, "cache_invalidate");
      for (const key of config.invalidate) {
        _queryClient.invalidateQueries({ queryKey: [key] });
      }
      completeStep(flow, cacheStep, { keys: config.invalidate });
    }

    // Success callbacks
    config.onSuccess?.(result);

    if (config.successToast) {
      toast.success(config.successToast);
    }

    reportHealth(domain, "ok", flow.steps.reduce((a, s) => a + (s.latencyMs ?? 0), 0));
    endFlow(flow, "success");

    return { ok: true, data: result };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    failStep(flow, execStep, error.message);
    endFlow(flow, "failed");

    reportHealth(domain, "degraded", undefined, error.message);

    console.error(`[runAction] ${config.name} failed:`, error.message);

    if (config.showErrorToast !== false) {
      toast.error(error.message || "Action failed");
    }

    config.onError?.(error);

    return { ok: false, error: error.message };
  }
}

/** Extract domain from action name. */
function extractDomain(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("wallet") || lower.includes("payment") || lower.includes("topup")) return "wallet";
  if (lower.includes("order") || lower.includes("checkout")) return "orders";
  if (lower.includes("orbit") || lower.includes("message") || lower.includes("thread")) return "orbit";
  if (lower.includes("delivery") || lower.includes("dispatch")) return "delivery";
  if (lower.includes("notification")) return "notifications";
  if (lower.includes("booking") || lower.includes("listing")) return "orders";
  if (lower.includes("radar") || lower.includes("geo")) return "radar";
  if (lower.includes("onboard")) return "onboarding";
  return "system";
}
