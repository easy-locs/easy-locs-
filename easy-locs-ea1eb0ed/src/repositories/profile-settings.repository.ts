/**
 * profile-settings.repository — Profile privacy/settings DB ops.
 */
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/services/db";

export async function fetchProfileSettings(userId: string, columns: string) {
  const { data } = await db("profiles").select(columns).eq("id", userId).single();
  return data;
}

export async function updateProfileColumn(userId: string, column: string, value: any) {
  const { error } = await db("profiles").update({ [column]: value } as any).eq("id", userId);
  if (error) console.error("[ProSettings] DB sync error:", error);
}
