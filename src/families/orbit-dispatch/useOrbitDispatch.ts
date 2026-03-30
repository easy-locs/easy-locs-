/**
 * useOrbitDispatch — React hook for the canonical Orbit Action Pipeline.
 * Components call dispatch(command) instead of managing send/call logic.
 *
 * Usage:
 *   const dispatch = useOrbitDispatch();
 *   dispatch({ type: "send_text", conversationId, body: "Hello" });
 */
import { useCallback } from "react";
import { toast } from "sonner";
import { orbitDispatch } from "./orbit-dispatch";
import type { OrbitCommand, OrbitCommandResult } from "./orbit-commands";
import { acquireSubmitLock, releaseSubmitLock } from "./send-locks";

export function useOrbitDispatch() {
  const dispatch = useCallback(async (cmd: OrbitCommand): Promise<OrbitCommandResult> => {
    const submitLock = acquireSubmitLock(cmd);

    if (!submitLock) {
      return { ok: false, error: "send_in_progress" };
    }

    try {
      const result = await orbitDispatch(cmd);
      if (!result.ok && result.error && !["duplicate_command", "send_in_progress"].includes(result.error)) {
        toast.error(result.error);
      }
      return result;
    } catch (err: any) {
      toast.error(err?.message || "Action failed");
      return { ok: false, error: err?.message || "dispatch_error" };
    } finally {
      releaseSubmitLock(submitLock);
    }
  }, []);

  return dispatch;
}
