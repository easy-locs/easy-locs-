/**
 * DeliveryInvoicePanel — Auto-invoicing for delivery fees with CSV/print export.
 * PASS83-Z: Delivery Invoicing
 */
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Printer, Loader2, Calendar, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  orgId: string;
  className?: string;
}

interface InvoiceRow {
  id: string;
  jobId: string;
  driverName: string;
  pickupAddress: string;
  dropoffAddress: string;
  fee: number;
  currency: string;
  deliveredAt: string;
  status: string;
}

interface InvoiceSummary {
  totalJobs: number;
  totalAmount: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
}

export default function DeliveryInvoicePanel({ orgId, className }: Props) {
  const { user } = useAuth();
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month" | "quarter">("month");

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const now = new Date();
      const since = new Date();
      if (period === "week") since.setDate(since.getDate() - 7);
      else if (period === "month") since.setMonth(since.getMonth() - 1);
      else since.setMonth(since.getMonth() - 3);

      const { data: jobs } = await supabase
        .from("delivery_jobs")
        .select("id, driver_id, pickup_address, dropoff_address, delivery_fee, currency, delivered_at, status")
        .eq("org_id", orgId)
        .eq("status", "completed")
        .gte("delivered_at", since.toISOString())
        .order("delivered_at", { ascending: false })
        .limit(500);

      const invoiceRows: InvoiceRow[] = (jobs || []).map(j => ({
        id: `INV-${j.id.slice(0, 8).toUpperCase()}`,
        jobId: j.id,
        driverName: j.driver_id ? j.driver_id.slice(0, 8) + "…" : "—",
        pickupAddress: j.pickup_address,
        dropoffAddress: j.dropoff_address,
        fee: j.delivery_fee || 0,
        currency: j.currency || "EUR",
        deliveredAt: j.delivered_at || "",
        status: "invoiced",
      }));

      setRows(invoiceRows);

      const total = invoiceRows.reduce((s, r) => s + r.fee, 0);
      setSummary({
        totalJobs: invoiceRows.length,
        totalAmount: total,
        currency: invoiceRows[0]?.currency || "EUR",
        periodStart: since.toISOString().slice(0, 10),
        periodEnd: now.toISOString().slice(0, 10),
      });
    } catch (err) {
      console.error("[invoicing]", err);
    } finally {
      setLoading(false);
    }
  }, [user, orgId, period]);

  useEffect(() => { refresh(); }, [refresh]);

  const exportCSV = () => {
    if (rows.length === 0) return;
    const headers = ["Référence", "Livreur", "Collecte", "Livraison", "Montant", "Devise", "Date livraison"];
    const csvRows = rows.map(r => [
      r.id, r.driverName, `"${r.pickupAddress}"`, `"${r.dropoffAddress}"`,
      r.fee.toFixed(2), r.currency, r.deliveredAt.slice(0, 10),
    ].join(","));
    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `facture-livraisons-${summary?.periodStart}-${summary?.periodEnd}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Facture CSV téléchargée");
  };

  const printInvoice = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !summary) return;
    const html = `<!DOCTYPE html><html><head><title>Facture Livraisons</title>
<style>body{font-family:system-ui;padding:40px;max-width:800px;margin:auto}
table{width:100%;border-collapse:collapse;margin:20px 0}
th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}
th{background:#f8f9fa}
.total{font-size:18px;font-weight:bold;text-align:right;margin-top:20px}
h1{font-size:20px}h2{font-size:14px;color:#666}</style></head>
<body><h1>📄 Facture Livraisons</h1>
<h2>Période: ${summary.periodStart} → ${summary.periodEnd}</h2>
<table><thead><tr><th>Réf.</th><th>Livreur</th><th>Collecte</th><th>Livraison</th><th>Montant</th><th>Date</th></tr></thead>
<tbody>${rows.map(r => `<tr><td>${r.id}</td><td>${r.driverName}</td><td>${r.pickupAddress}</td><td>${r.dropoffAddress}</td><td>${r.fee.toFixed(2)} ${r.currency}</td><td>${r.deliveredAt.slice(0, 10)}</td></tr>`).join("")}</tbody></table>
<div class="total">Total: ${summary.totalAmount.toFixed(2)} ${summary.currency}</div>
<p style="color:#999;font-size:10px;margin-top:40px">Généré par EASY-LOCS® le ${new Date().toLocaleDateString("fr")}</p>
</body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12">
      <Loader2 className="h-5 w-5 animate-spin" style={{ color: "hsl(var(--hud-cyan) / 0.3)" }} />
    </div>;
  }

  return (
    <div className={`space-y-4 ${className || ""}`}>
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: "hsl(var(--hud-text))" }}>
          <FileText className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} /> Facturation
        </h3>
        <div className="flex gap-1">
          {(["week", "month", "quarter"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className="text-[9px] px-2 py-1 rounded-full font-medium"
              style={{
                background: period === p ? "hsl(var(--hud-cyan) / 0.12)" : "hsl(var(--hud-border) / 0.06)",
                color: period === p ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.4)",
              }}>
              {p === "week" ? "Semaine" : p === "month" ? "Mois" : "Trimestre"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary card */}
      {summary && (
        <div className="rounded-xl p-4"
          style={{ background: "linear-gradient(135deg, hsl(var(--hud-cyan) / 0.08), hsl(var(--success) / 0.06))", border: "1px solid hsl(var(--hud-cyan) / 0.12)" }}>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                <Calendar className="h-3 w-3 inline mr-1" />
                {summary.periodStart} → {summary.periodEnd}
              </p>
              <p className="text-2xl font-black mt-1" style={{ color: "hsl(var(--hud-cyan))" }}>
                {summary.totalAmount.toFixed(2)} <span className="text-sm">{summary.currency}</span>
              </p>
              <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                {summary.totalJobs} livraisons facturées
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Button size="sm" variant="outline" onClick={exportCSV} className="text-[9px] h-7 px-2">
                <Download className="h-3 w-3 mr-1" /> CSV
              </Button>
              <Button size="sm" variant="outline" onClick={printInvoice} className="text-[9px] h-7 px-2">
                <Printer className="h-3 w-3 mr-1" /> Imprimer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice rows */}
      <div className="space-y-1">
        {rows.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-6 w-6 mx-auto mb-2" style={{ color: "hsl(var(--hud-text-dim) / 0.15)" }} />
            <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>Aucune facture pour cette période</p>
          </div>
        ) : rows.slice(0, 20).map(row => (
          <div key={row.id} className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.06)" }}>
            <CheckCircle2 className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--success))" }} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium truncate" style={{ color: "hsl(var(--hud-text))" }}>
                {row.id}
              </p>
              <p className="text-[8px] truncate" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
                {row.pickupAddress} → {row.dropoffAddress}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-cyan))" }}>
                {row.fee.toFixed(2)}€
              </p>
              <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
                {row.deliveredAt.slice(0, 10)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
