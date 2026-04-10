/**
 * Call Repository — Canonical DB access for ghost_call_sessions.
 */
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/services/db";



export const callRepo = {
  findById(id: string) {
    return db("ghost_call_sessions").select("*").eq("id", id).maybeSingle();
  },
  upsert(payload: Record<string, unknown>) {
    return db("ghost_call_sessions").upsert(payload);
  },
  updateStatus(id: string, status: string) {
    return db("ghost_call_sessions").update({ status }).eq("id", id);
  },
};
