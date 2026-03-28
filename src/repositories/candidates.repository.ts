/**
 * candidates.repository — DB operations for Candidates page.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchCandidatesAndProperties(orgId: string) {
  const [{ data: c }, { data: p }] = await Promise.all([
    supabase.from("candidates").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
    supabase.from("properties").select("id, label").eq("org_id", orgId).order("label"),
  ]);
  return { candidates: (c || []) as any[], properties: p || [] };
}

export async function insertCandidate(record: Record<string, any>) {
  const { error } = await (supabase as any).from("candidates").insert(record);
  if (error) throw error;
}

export async function updateCandidateStatus(id: string, status: string) {
  await (supabase as any).from("candidates").update({ status }).eq("id", id);
}

export async function deleteCandidate(id: string) {
  await (supabase as any).from("candidates").delete().eq("id", id);
}
