/**
 * Call Repository — Canonical DB access for ghost_call_sessions.
 */
import { db } from "@/services/db";



import { cFrom, cRpc } from "@/lib/execution/content-mutation";
export const callRepo = {
  findById(id: string) {
    return cFrom("ghost_call_sessions").select("*").eq("id", id).maybeSingle();
  },
  upsert(payload: Record<string, unknown>) {
    return cFrom("ghost_call_sessions").upsert(payload);
  },
  updateStatus(id: string, status: string) {
    return cFrom("ghost_call_sessions").update({ status }).eq("id", id);
  },
};
