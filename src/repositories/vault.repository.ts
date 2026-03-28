/**
 * vault.repository — DB operations for Vault page.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchVaultFiles(orgId: string) {
  const { data } = await supabase.from("vault_files").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
  return (data || []) as any[];
}

export async function uploadVaultFile(path: string, file: File) {
  const { error } = await supabase.storage.from("vault").upload(path, file);
  if (error) throw error;
}

export async function insertVaultFileRecord(record: Record<string, any>) {
  await (supabase as any).from("vault_files").insert(record);
}

export async function downloadVaultFile(path: string) {
  const { data, error } = await supabase.storage.from("vault").download(path);
  if (error) throw error;
  return data;
}

export async function deleteVaultFile(id: string, storagePath: string) {
  await supabase.storage.from("vault").remove([storagePath]);
  const { error } = await (supabase as any).from("vault_files").delete().eq("id", id);
  if (error) throw error;
}
