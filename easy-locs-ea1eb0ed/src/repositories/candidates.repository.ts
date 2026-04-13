/**
 * candidates.repository — DB operations for Candidates page.
 */
import { db } from "@/services/db";

export async function fetchCandidatesAndProperties(orgId: string) {
  const [{ data: c }, { data: p }] = await Promise.all([
    db("candidates").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
    db("properties").select("id, label").eq("org_id", orgId).order("label"),
  ]);
  return { candidates: (c || []) as any[], properties: p || [] };
}

export async function insertCandidate(record: Record<string, any>) {
  const { error } = await db("candidates").insert(record);
  if (error) throw error;
}

export async function updateCandidateStatus(id: string, status: string) {
  await db("candidates").update({ status }).eq("id", id);
}

export async function deleteCandidate(id: string) {
  await db("candidates").delete().eq("id", id);
}
