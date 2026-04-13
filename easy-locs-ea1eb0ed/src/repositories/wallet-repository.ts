/**
 * wallet-repository — Canonical data access for wallet domain.
 * No UI component should import db directly for wallet operations.
 */
import { db } from "@/services/db";

/** Fetch display names for a list of user IDs (counterparty resolution) */
export async function fetchCounterpartyNames(userIds: string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};
  const { data } = await db
    .from("profiles")
    .select("id, name, first_name, last_name, username")
    .in("id", userIds);
  const map: Record<string, string> = {};
  (data ?? []).forEach((p: any) => {
    map[p.id] = p.name || [p.first_name, p.last_name].filter(Boolean).join(" ") || p.username || "User";
  });
  return map;
}
