/**
 * Test Batch Engine — Create and rollback test merchant import batches.
 */
import { supabase } from "@/integrations/supabase/client";
import { importMerchantBatch } from "@/lib/growth/import-engine";
import type { ImportedMerchantRecord } from "@/lib/growth/types";

export async function createMerchantImportTestBatch(params: {
  batchName: string;
  records: ImportedMerchantRecord[];
  createdBy?: string | null;
}) {
  const { data: batch, error: batchErr } = await (supabase as any)
    .from("import_test_batches")
    .insert({
      batch_name: params.batchName,
      total_records: params.records.length,
      created_by: params.createdBy ?? null,
      status: "running",
    })
    .select("*")
    .single();

  if (batchErr) throw batchErr;

  const result = await importMerchantBatch(params.records);

  // Tag all imported records with test_batch_id
  if (result.imported > 0) {
    await (supabase as any)
      .from("merchant_onboarding_profiles")
      .update({ test_batch_id: batch.id, is_test: true, created_by_test: true })
      .eq("is_test", false)
      .is("test_batch_id", null)
      .order("created_at", { ascending: false })
      .limit(result.imported);

    await (supabase as any)
      .from("storefront_pages")
      .update({ test_batch_id: batch.id, is_test: true, created_by_test: true })
      .eq("is_test", false)
      .is("test_batch_id", null)
      .order("created_at", { ascending: false })
      .limit(result.imported);

    await (supabase as any)
      .from("menu_items")
      .update({ test_batch_id: batch.id, is_test: true, created_by_test: true })
      .eq("is_test", false)
      .is("test_batch_id", null)
      .order("created_at", { ascending: false })
      .limit(result.imported * 10);
  }

  await (supabase as any)
    .from("import_test_batches")
    .update({
      status: "completed",
      imported_records: result.imported,
      failed_records: result.failed,
      completed_at: new Date().toISOString(),
      metadata_json: { errors: result.errors ?? [] },
    })
    .eq("id", batch.id);

  return { batchId: batch.id, ...result };
}

export async function deleteMerchantImportTestBatch(batchId: string) {
  // Delete in safe FK order
  await (supabase as any).from("menu_items").delete().eq("test_batch_id", batchId);
  await (supabase as any).from("catalog_items").delete().eq("test_batch_id", batchId);
  await (supabase as any).from("storefront_pages").delete().eq("test_batch_id", batchId);
  await (supabase as any).from("merchant_onboarding_profiles").delete().eq("test_batch_id", batchId);

  await (supabase as any)
    .from("import_test_batches")
    .update({ status: "deleted", completed_at: new Date().toISOString() })
    .eq("id", batchId);

  return { ok: true };
}

export async function deleteAllTestData() {
  const { data: batches } = await (supabase as any)
    .from("import_test_batches")
    .select("id")
    .neq("status", "deleted");

  for (const batch of batches ?? []) {
    await deleteMerchantImportTestBatch(batch.id);
  }

  return { ok: true, deletedBatches: (batches ?? []).length };
}

export async function listTestBatches() {
  const { data, error } = await (supabase as any)
    .from("import_test_batches")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
