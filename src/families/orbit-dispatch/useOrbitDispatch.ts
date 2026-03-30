/**
 * useOrbitDispatch — React hook for the canonical Orbit Action Pipeline.
 * Components call dispatch(command) instead of managing send/call logic.
 *
 * Usage:
 *   const dispatch = useOrbitDispatch();
 *   dispatch({ type: "send_text", conversationId, body: "Hello" });
 */
import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { orbitDispatch } from "./orbit-dispatch";
import type { OrbitCommand, OrbitCommandResult } from "./orbit-commands";

export function useOrbitDispatch() {
  const busyRef = useRef(false);

  const dispatch = useCallback(async (cmd: OrbitCommand): Promise<OrbitCommandResult> => {
    // Per-type concurrency: allow parallel sends but not double-taps of same type
    if (busyRef.current && ["send_text", "reply"].includes(cmd.type)) {
      return { ok: false, error: "send_in_progress" };
    }

    if (["send_text", "reply"].includes(cmd.type)) {
      busyRef.current = true;
    }

    try {
      const result = await orbitDispatch(cmd);
      if (!result.ok && result.error && result.error !== "duplicate_command") {
        toast.error(result.error);
      }
      return result;
    } catch (err: any) {
      toast.error(err?.message || "Action failed");
      return { ok: false, error: err?.message || "dispatch_error" };
    } finally {
      busyRef.current = false;
    }
  }, []);

  return dispatch;
}
