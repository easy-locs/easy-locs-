/**
 * profile-settings.repository — Profile privacy/settings DB ops.
 */
import { db } from "@/services/db";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
export async function fetchProfileSettings(userId: string, columns: string) {
  const { data } = await cFrom("profiles").select(columns).eq("id", userId).single();
  return data;
}

export async function updateProfileColumn(userId: string, column: string, value: any) {
  const { error } = await cFrom("profiles").update({ [column]: value } as any).eq("id", userId);
  if (error) console.error("[ProSettings] DB sync error:", error);
}
