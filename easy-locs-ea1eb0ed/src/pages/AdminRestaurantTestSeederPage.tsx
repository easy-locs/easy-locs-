/**
 * AdminRestaurantTestSeederPage — Seed/delete test restaurants with batch tracking.
 */
import { useState, useEffect, useCallback } from "react";
import { adminOpsService } from "@/services";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface TestBatch {
  id: string;
  batch_name: string;
  total_records: number;
  imported_records: number | null;
  failed_records: number | null;
  status: string;
  created_at: string;
  completed_at: string | null;
}

const CITIES = ["Dubai Marina", "JLT", "Business Bay", "Al Barsha", "Deira", "DIFC", "Jumeirah", "Downtown", "Karama", "Bur Dubai"];
const TYPES = ["pizza", "burger", "shawarma", "sushi", "indian", "chinese", "thai", "italian", "mexican", "seafood"];

function generateBatchRecords(count: number, batchLabel: string) {
  return Array.from({ length: count }, (_, i) => ({
    business_name: `TEST ${TYPES[i % TYPES.length].toUpperCase()} ${batchLabel} #${i + 1}`,
    city: CITIES[i % CITIES.length],
    country_code: "AE",
    status: "imported_not_claimed",
    business_type: TYPES[i % TYPES.length],
  }));
}

export default function AdminRestaurantTestSeederPage() {
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(50);
  const [batches, setBatches] = useState<TestBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [lastReport, setLastReport] = useState<{ inserted: number; failed: number; errors: string[] } | null>(null);

  const loadBatches = useCallback(async () => {
    setLoadingBatches(true);
    const data = await adminOpsService.fetchTestBatches(20);
    setBatches(data as TestBatch[]);
    setLoadingBatches(false);
  }, []);

  useEffect(() => { loadBatches(); }, [loadBatches]);

  const seedBatch = async () => {
    setBusy(true);
    setLastReport(null);
    const batchLabel = `B${Date.now().toString(36).toUpperCase()}`;
    let inserted = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      const batch = await adminOpsService.insertTestBatch({
        batch_name: `Test ${count} restaurants — ${batchLabel}`,
        total_records: count,
        status: "running",
      }) as any;

      const rows = generateBatchRecords(count, batchLabel);

      for (let i = 0; i < rows.length; i += 25) {
        const chunk = rows.slice(i, i + 25).map(r => ({
          ...r,
          test_batch_id: batch.id,
          is_test: true,
          created_by_test: true,
        }));

        try {
          const insertData = await adminOpsService.insertOnboardingProfiles(chunk);
          inserted += insertData.length;
        } catch (insertErr: any) {
          failed += chunk.length;
          errors.push(`Chunk ${i / 25 + 1}: ${insertErr.message}`);
        }
      }

      await adminOpsService.updateTestBatch(batch.id, {
        status: failed > 0 ? "partial" : "completed",
        imported_records: inserted,
        failed_records: failed,
        completed_at: new Date().toISOString(),
        metadata_json: { errors },
      });

      setLastReport({ inserted, failed, errors });
      toast.success(`${inserted} inserted, ${failed} failed`);
      loadBatches();
    } catch (e: any) {
      toast.error(e.message ?? "Seed failed");
      setLastReport({ inserted, failed, errors: [e.message] });
    }
    setBusy(false);
  };

  const deleteBatch = async (batchId: string) => {
    setBusy(true);
    try {
      await adminOpsService.deleteMenuItemsByBatch(batchId);
      await adminOpsService.updateTestBatch(batchId, {
        status: "deleted",
        completed_at: new Date().toISOString(),
      });

      toast.success("Batch deleted");
      loadBatches();
    } catch (e: any) {
      toast.error(e.message ?? "Delete failed");
    }
    setBusy(false);
  };

  const deleteLastBatch = async () => {
    const last = batches.find(b => b.status !== "deleted");
    if (!last) { toast.error("No active batch"); return; }
    await deleteBatch(last.id);
  };

  const wipeAllTestData = async () => {
    setBusy(true);
    try {
      await adminOpsService.wipeTestOnboardingProfiles();
      const activeBatches = batches.filter(b => b.status !== "deleted");
      for (const b of activeBatches) {
        await adminOpsService.markTestBatchDeleted(b.id);
      }
      toast.success("All test data wiped");
      loadBatches();
    } catch (e: any) {
      toast.error(e.message ?? "Wipe failed");
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground">Restaurant Test Seeder</h1>
        <p className="text-sm text-muted-foreground">Seed test restaurants with batch tracking, delete by batch.</p>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={count}
              onChange={e => setCount(Number(e.target.value))}
              className="bg-muted border border-border rounded-lg px-3 py-2 text-sm"
            >
              {[10, 25, 50, 100].map(n => (
                <option key={n} value={n}>{n} restaurants</option>
              ))}
            </select>

            <Button onClick={seedBatch} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              Seed Batch
            </Button>

            <Button variant="outline" onClick={deleteLastBatch} disabled={busy}>
              <Trash2 className="w-4 h-4 mr-1" /> Delete Last Batch
            </Button>

            <Button variant="destructive" onClick={wipeAllTestData} disabled={busy}>
              Wipe All Test Data
            </Button>
          </div>

          {/* Preview */}
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            <strong>Preview:</strong> Will insert {count} test restaurants across {CITIES.slice(0, Math.min(count, CITIES.length)).join(", ")} with types {TYPES.slice(0, Math.min(count, TYPES.length)).join(", ")}.
          </div>
        </CardContent>
      </Card>

      {/* Last report */}
      {lastReport && (
        <Card>
          <CardHeader><CardTitle className="text-base">Import Report</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-4 text-sm">
              <span className="text-green-600 font-medium">✓ {lastReport.inserted} inserted</span>
              {lastReport.failed > 0 && <span className="text-destructive font-medium">✗ {lastReport.failed} failed</span>}
            </div>
            {lastReport.errors.length > 0 && (
              <div className="text-xs text-destructive bg-destructive/10 rounded-lg p-2">
                {lastReport.errors.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Batch list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Batches</CardTitle>
          <Button variant="ghost" size="sm" onClick={loadBatches} disabled={loadingBatches}>
            <RefreshCw className={`w-4 h-4 ${loadingBatches ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {batches.length === 0 && <p className="text-sm text-muted-foreground">No batches yet.</p>}
          {batches.map(b => (
            <div key={b.id} className="flex items-center justify-between border border-border rounded-lg p-3">
              <div className="space-y-1">
                <div className="text-sm font-medium text-foreground">{b.batch_name}</div>
                <div className="text-xs text-muted-foreground">
                  {b.imported_records ?? 0} inserted · {b.failed_records ?? 0} failed · {new Date(b.created_at).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={b.status === "deleted" ? "secondary" : b.status === "completed" ? "default" : "outline"}>
                  {b.status}
                </Badge>
                {b.status !== "deleted" && (
                  <Button variant="ghost" size="sm" onClick={() => deleteBatch(b.id)} disabled={busy}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
