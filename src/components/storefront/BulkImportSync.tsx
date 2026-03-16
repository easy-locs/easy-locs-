/**
 * BulkImportSync — CSV/Excel import, export, sync engine for catalog
 */
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
}

export default function BulkImportSync({ shopId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const { data: jobs = [] } = useQuery({
    queryKey: ["import-jobs", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_import_jobs")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const { data: catalogItems = [] } = useQuery({
    queryKey: ["bulk-catalog", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("catalog_items")
        .select("id, title, price, currency, sku, stock_quantity, category_id, available, description")
        .eq("shop_id", shopId)
        .order("sort_order");
      return data || [];
    },
  });

  const exportCSV = () => {
    if (!catalogItems.length) { toast.error("No products to export"); return; }
    const headers = ["title", "price", "currency", "sku", "stock_quantity", "available", "description"];
    const rows = catalogItems.map((item: any) => headers.map(h => {
      const val = item[h];
      if (typeof val === "string" && val.includes(",")) return `"${val}"`;
      return val ?? "";
    }).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `catalog-${shopId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${catalogItems.length} products`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);

    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) { toast.error("Empty file"); setImporting(false); return; }

      const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));
      const titleIdx = headers.indexOf("title");
      const priceIdx = headers.indexOf("price");
      const currencyIdx = headers.indexOf("currency");
      const skuIdx = headers.indexOf("sku");
      const stockIdx = headers.indexOf("stock_quantity");
      const descIdx = headers.indexOf("description");

      if (titleIdx === -1) { toast.error("CSV must have a 'title' column"); setImporting(false); return; }

      // Create import job
      const { data: job } = await (supabase as any).from("storefront_import_jobs").insert({
        shop_id: shopId,
        user_id: user!.id,
        source_type: "csv",
        total_rows: lines.length - 1,
        status: "processing",
      }).select().single();

      let processed = 0;
      let errors = 0;
      const errorList: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
        const title = cols[titleIdx];
        if (!title) { errors++; errorList.push({ row: i, error: "Missing title" }); continue; }

        try {
          await (supabase as any).from("catalog_items").insert({
            shop_id: shopId,
            user_id: user!.id,
            title,
            price: priceIdx >= 0 ? parseFloat(cols[priceIdx]) || 0 : 0,
            currency: currencyIdx >= 0 ? cols[currencyIdx] || "EUR" : "EUR",
            sku: skuIdx >= 0 ? cols[skuIdx] || null : null,
            stock_quantity: stockIdx >= 0 ? parseInt(cols[stockIdx]) || 0 : 0,
            description: descIdx >= 0 ? cols[descIdx] || null : null,
          });
          processed++;
        } catch (err: any) {
          errors++;
          errorList.push({ row: i, error: err.message || "Insert failed" });
        }
      }

      // Update job
      if (job) {
        await (supabase as any).from("storefront_import_jobs").update({
          status: errors > 0 ? "completed_with_errors" : "completed",
          processed_rows: processed,
          error_rows: errors,
          errors_json: errorList,
          completed_at: new Date().toISOString(),
        }).eq("id", job.id);
      }

      qc.invalidateQueries({ queryKey: ["import-jobs"] });
      qc.invalidateQueries({ queryKey: ["bulk-catalog"] });
      toast.success(`Imported ${processed} products${errors > 0 ? `, ${errors} errors` : ""}`);
    } catch (err: any) {
      toast.error("Import failed: " + (err.message || "Unknown error"));
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const templateCSV = () => {
    const csv = "title,price,currency,sku,stock_quantity,description\nSample Product,29.99,EUR,SKU-001,100,A great product";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            Bulk Import & Export
          </h3>
          <Badge variant="outline" className="text-2xs">{catalogItems.length} products</Badge>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" className="text-xs h-10" onClick={exportCSV}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
          </Button>
          <Button size="sm" variant="outline" className="text-xs h-10" onClick={templateCSV}>
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Template
          </Button>
        </div>

        {/* Import */}
        <div className="border-2 border-dashed border-border rounded-xl p-4 text-center space-y-2">
          <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-xs text-muted-foreground">Drop a CSV file or click to import</p>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <Button size="sm" className="text-xs" onClick={() => fileRef.current?.click()} disabled={importing}>
            {importing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
            {importing ? "Importing..." : "Import CSV"}
          </Button>
        </div>

        {/* Import history */}
        {jobs.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold">Import History</h4>
            {jobs.map((job: any) => (
              <div key={job.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-2.5">
                <div className="flex items-center gap-2">
                  {job.status === "completed" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  ) : job.status === "completed_with_errors" ? (
                    <AlertCircle className="w-3.5 h-3.5 text-warning" />
                  ) : job.status === "processing" ? (
                    <RefreshCw className="w-3.5 h-3.5 text-info animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-xs font-medium">{job.processed_rows}/{job.total_rows} rows</p>
                    <p className="text-2xs text-muted-foreground">{new Date(job.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {job.error_rows > 0 && (
                    <Badge variant="destructive" className="text-2xs">{job.error_rows} errors</Badge>
                  )}
                  <Badge variant="secondary" className="text-2xs">{job.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Format guide */}
        <div className="bg-primary/5 rounded-xl p-3 text-2xs text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">CSV Format</p>
          <p>Required: <code className="bg-muted px-1 rounded">title</code></p>
          <p>Optional: <code className="bg-muted px-1 rounded">price, currency, sku, stock_quantity, description</code></p>
        </div>
      </CardContent>
    </Card>
  );
}
