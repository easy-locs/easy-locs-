import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  createMerchantImportTestBatch,
  deleteMerchantImportTestBatch,
  deleteAllTestData,
  listTestBatches,
} from "@/lib/growth/test-batch-engine";
import { generateDubaiTestDataset } from "@/lib/growth/dubai-test-dataset";

export default function AdminImportTestBatchesPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const data = await listTestBatches();
    setBatches(data);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreateTestBatch() {
    setLoading(true);
    try {
      const records = generateDubaiTestDataset();
      const result = await createMerchantImportTestBatch({
        batchName: `Dubai Test ${new Date().toISOString().slice(0, 16)}`,
        records,
      });
      toast.success(`Imported ${result.imported} / ${result.total} restaurants`);
      if (result.failed > 0) {
        toast.error(`${result.failed} failed: ${(result.errors ?? []).slice(0, 3).join(", ")}`);
      }
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Import failed");
    }
    setLoading(false);
  }

  async function handleDeleteBatch(batchId: string) {
    setLoading(true);
    try {
      await deleteMerchantImportTestBatch(batchId);
      toast.success("Batch deleted");
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Delete failed");
    }
    setLoading(false);
  }

  async function handleDeleteAll() {
    setLoading(true);
    try {
      const res = await deleteAllTestData();
      toast.success(`Deleted ${res.deletedBatches} batch(es)`);
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Delete all failed");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Import Test Batches</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create, inspect, and rollback test merchant imports.
        </p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleCreateTestBatch}
          disabled={loading}
          className="bg-primary text-primary-foreground rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Running…" : "Import 50 Dubai Restaurants"}
        </button>
        <button
          onClick={handleDeleteAll}
          disabled={loading}
          className="bg-destructive text-destructive-foreground rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          Delete All Test Data
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Batches ({batches.length})</h2>
        {batches.length === 0 && (
          <p className="text-muted-foreground text-sm">No test batches yet.</p>
        )}
        {batches.map((b: any) => {
          const meta = b.metadata_json ?? {};
          const errors = (meta.errors ?? []) as string[];
          return (
            <div key={b.id} className="border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{b.batch_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.status} · {b.imported_records}/{b.total_records} imported · {b.failed_records} failed
                  </p>
                </div>
                {b.status !== "deleted" && (
                  <button
                    onClick={() => handleDeleteBatch(b.id)}
                    disabled={loading}
                    className="text-destructive text-xs underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                )}
              </div>
              {errors.length > 0 && (
                <details className="text-xs">
                  <summary className="text-destructive cursor-pointer">
                    {errors.length} error(s)
                  </summary>
                  <ul className="mt-1 space-y-0.5 text-muted-foreground">
                    {errors.map((e: string, i: number) => (
                      <li key={i}>• {e}</li>
                    ))}
                  </ul>
                </details>
              )}
              <p className="text-xs text-muted-foreground">
                Created: {new Date(b.created_at).toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
