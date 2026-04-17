/**
 * candidates.repository — DB operations for Candidates page.
 */
import { db } from "@/services/db";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
export async function fetchCandidatesAndProperties(orgId: string) {
  const [{ data: c }, { data: p }] = await Promise.all([
    cFrom("candidates").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
    cFrom("properties").select("id, label").eq("org_id", orgId).order("label"),
  ]);
  return { candidates: (c || []) as any[], properties: p || [] };
}

export async function insertCandidate(record: Record<string, any>) {
  const { error } = await cFrom("candidates").insert(record);
  if (error) throw error;
}

export async function updateCandidateStatus(id: string, status: string) {
  await cFrom("candidates").update({ status }).eq("id", id);
}

export async function deleteCandidate(id: string) {
  await cFrom("candidates").delete().eq("id", id);
}
