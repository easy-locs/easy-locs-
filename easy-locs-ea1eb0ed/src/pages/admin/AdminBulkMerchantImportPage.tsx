import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { bulkAutoOnboardMerchants } from "@/lib/merchant/bulkImport";
import { toast } from "sonner";

const DEMO_JSON = JSON.stringify(
  [
    {
      name: "Pizza Times JLT",
      category: "food",
      subcategory: "pizza",
      city: "Dubai",
      area: "JLT",
      items: [
        { name: "Margherita", description: "Tomato, mozzarella, basil", price: 29 },
        { name: "Pepperoni", description: "Pepperoni, mozzarella", price: 35 },
        { name: "Coke", description: "33cl", price: 6 },
      ],
    },
    {
      name: "Pizza Times Marina",
      category: "food",
      subcategory: "pizza",
      city: "Dubai",
      area: "Dubai Marina",
      items: [
        { name: "Margherita", description: "Tomato, mozzarella, basil", price: 29 },
        { name: "BBQ Chicken", description: "BBQ sauce, chicken, onion", price: 38 },
        { name: "Garlic Bread", description: "Freshly baked", price: 14 },
      ],
    },
  ],
  null,
  2
);

export default function AdminBulkMerchantImportPage() {
  const navigate = useNavigate();
  const [jsonText, setJsonText] = useState(DEMO_JSON);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any[]>([]);

  const runImport = async () => {
    try {
      setRunning(true);
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        toast.error("JSON must be an array");
        return;
      }
      const res = await bulkAutoOnboardMerchants(parsed);
      setResult(res);
      const ok = res.filter((r) => r.ok).length;
      toast.success(`${ok} merchants imported`);
    } catch (err: any) {
      toast.error(err.message || "Bulk import failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Bulk Merchant Import</h1>
          <p className="text-xs text-muted-foreground">Paste JSON and auto-create stores</p>
        </div>
      </div>

      <div className="space-y-3">
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          rows={18}
          className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-xs font-mono resize-none"
        />
        <button
          onClick={runImport}
          disabled={running}
          className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold disabled:opacity-50"
        >
          {running ? "Importing..." : "Run Bulk Import"}
        </button>
      </div>

      {result.length > 0 && (
        <div className="space-y-3">
          {result.map((row: any, i: number) => (
            <div key={`${row.name}-${i}`} className="rounded-2xl border border-border/20 bg-card p-4">
              <div className="text-sm font-bold">{row.name}</div>
              <div className={`text-xs mt-1 ${row.ok ? "text-emerald-500" : "text-destructive"}`}>
                {row.ok ? `Created · ${row.merchantId}` : row.error}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
