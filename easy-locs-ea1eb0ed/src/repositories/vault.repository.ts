/**
 * vault.repository — DB operations for Vault page.
 */
import { db } from "@/services/db";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
export async function fetchVaultFiles(orgId: string) {
  const { data } = await cFrom("vault_files").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
  return (data || []) as any[];
}

export async function uploadVaultFile(path: string, file: File) {
  const { error } = await db.storage.from("vault").upload(path, file);
  if (error) throw error;
}

export async function insertVaultFileRecord(record: Record<string, any>) {
  await cFrom("vault_files").insert(record);
}

export async function downloadVaultFile(path: string) {
  const { data, error } = await db.storage.from("vault").download(path);
  if (error) throw error;
  return data;
}

export async function deleteVaultFile(id: string, storagePath: string) {
  await db.storage.from("vault").remove([storagePath]);
  const { error } = await cFrom("vault_files").delete().eq("id", id);
  if (error) throw error;
}
