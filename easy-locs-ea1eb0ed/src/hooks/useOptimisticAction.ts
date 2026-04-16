/**
 * useOptimisticAction — React 19 ergonomics for optimistic mutations.
 *
 * Wraps `useOptimistic` + `useTransition` so callers can:
 *   - render an optimistic value immediately
 *   - run an async mutator
 *   - automatically revert on error and surface a toast
 *
 * Rollback contract:
 *   - The optimistic value is computed by `reducer(currentState, payload)`
 *     and shown synchronously while the transition runs.
 *   - When the mutator throws, React drops the optimistic value at the end
 *     of the transition and the consumer goes back to the upstream `state`
 *     prop you pass in. We additionally invoke `onError` (or a toast
 *     fallback) so the user is notified.
 *   - When the mutator resolves, the consumer is responsible for updating
 *     the upstream `state` (e.g. via React Query invalidation, Zustand
 *     setter, etc.) so the optimistic value is reconciled with the real
 *     value on the next render.
 *
 * Designed for high-frequency, low-risk interactions (likes, favorites,
 * follow/unfollow, status toggles) where INP and perceived latency matter.
 * Do NOT layer it on top of stores that are already optimistic — pick one
 * source of optimistic state per interaction.
 */
import { useCallback, useOptimistic, useTransition } from "react";
import { toast } from "sonner";

export interface UseOptimisticActionOptions<TState, TPayload> {
  state: TState;
  reducer: (current: TState, payload: TPayload) => TState;
  mutate: (payload: TPayload) => Promise<TState | void>;
  onError?: (error: unknown, payload: TPayload, previous: TState) => void;
  onSuccess?: (next: TState | void, payload: TPayload) => void;
  errorMessage?: string;
}

export interface UseOptimisticActionResult<TState, TPayload> {
  optimisticState: TState;
  isPending: boolean;
  run: (payload: TPayload) => void;
}

export function useOptimisticAction<TState, TPayload>(
  options: UseOptimisticActionOptions<TState, TPayload>,
): UseOptimisticActionResult<TState, TPayload> {
  const { state, reducer, mutate, onError, onSuccess, errorMessage } = options;
  const [optimisticState, applyOptimistic] = useOptimistic<TState, TPayload>(state, reducer);
  const [isPending, startTransition] = useTransition();

  const run = useCallback(
    (payload: TPayload) => {
      const previous = state;
      startTransition(async () => {
        applyOptimistic(payload);
        try {
          const next = await mutate(payload);
          onSuccess?.(next, payload);
        } catch (error) {
          // React drops the optimistic value automatically when the
          // transition ends; we just need to notify the caller.
          if (onError) {
            onError(error, payload, previous);
          } else {
            toast.error(errorMessage ?? "Action failed, please retry.");
          }
        }
      });
    },
    [state, applyOptimistic, mutate, onError, onSuccess, errorMessage],
  );

  return { optimisticState, isPending, run };
}
