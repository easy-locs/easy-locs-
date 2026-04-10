/**
 * profile-settings.repository — Profile privacy/settings DB ops.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchProfileSettings(userId: string, columns: string) {
  const { data } = await supabase.from("profiles").select(columns).eq("id", userId).single();
  return data;
}

export async function updateProfileColumn(userId: string, column: string, value: any) {
  const { error } = await supabase.from("profiles").update({ [column]: value } as any).eq("id", userId);
  if (error) console.error("[ProSettings] DB sync error:", error);
}
