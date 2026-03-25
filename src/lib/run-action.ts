/**
 * runAction — Canonical action executor for ALL domain operations.
 *
 * Every write operation (pay, send message, create order, etc.) MUST
 * flow through this function to ensure:
 *   1. Consistent error handling
 *   2. Platform bus event emission
 *   3. React Query cache invalidation
 *   4. Audit trail logging
 *
 * Flow: UI → runAction() → Domain Service → DB → platformBus → UI refresh
 */

import { platformBus } from "@/lib/shared/platform-bus";
import type { PlatformEventType } from "@/lib/shared/platform-bus";
import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Singleton query client reference — set once from App.tsx
let _queryClient: QueryClient | null = null;

export function setActionQueryClient(qc: QueryClient): void {
  _queryClient = qc;
}

export interface ActionConfig<T> {
  /** Human-readable action name for logging */
  name: string;
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
  try {
    const result = await config.execute();

    // Emit platform event
    if (config.event) {
      platformBus.emit(config.event, config.eventPayload ?? {}, "system");
    }

    // Invalidate React Query caches
    if (_queryClient && config.invalidate?.length) {
      for (const key of config.invalidate) {
        _queryClient.invalidateQueries({ queryKey: [key] });
      }
    }

    // Success callbacks
    config.onSuccess?.(result);

    if (config.successToast) {
      toast.success(config.successToast);
    }

    return { ok: true, data: result };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error(`[runAction] ${config.name} failed:`, error.message);

    if (config.showErrorToast !== false) {
      toast.error(error.message || "Action failed");
    }

    config.onError?.(error);

    return { ok: false, error: error.message };
  }
}
