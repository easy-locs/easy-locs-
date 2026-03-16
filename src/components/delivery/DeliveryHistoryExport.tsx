/**
 * DeliveryHistoryExport — Full delivery history with filters and CSV export.
 * PASS80-N: Delivery History & Export
 */
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Download, Filter, Search, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DeliveryJob } from "@/hooks/useDriverMissions";

const STATUS_LABELS: Record<string, string> = {
  pending: "⏳ En attente",
  assigned: "📩 Assigné",
  accepted: "✅ Accepté",
  in_progress: "🚗 En cours",
  completed: "🏁 Terminé",
  cancelled: "❌ Annulé",
};

interface Props {
  jobs: DeliveryJob[];
  loading?: boolean;
}

export default function DeliveryHistoryExport({ jobs, loading }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = useMemo(() => {
    return jobs.filter(j => {
      if (statusFilter !== "all" && j.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const match = [j.package_description, j.pickup_address, j.dropoff_address, j.id]
          .filter(Boolean).join(" ").toLowerCase().includes(q);
        if (!match) return false;
      }
      if (dateFrom && j.created_at && j.created_at < dateFrom) return false;
      if (dateTo && j.created_at && j.created_at > dateTo + "T23:59:59") return false;
      return true;
    });
  }, [jobs, search, statusFilter, dateFrom, dateTo]);

  const exportCSV = () => {
    const headers = ["ID", "Statut", "Retrait", "Livraison", "Description", "Frais", "Devise", "Priorité", "Créé le", "Livré le"];
    const rows = filtered.map(j => [
      j.id,
      j.status,
      `"${j.pickup_address}"`,
      `"${j.dropoff_address}"`,
      `"${j.package_description || ""}"`,
      j.delivery_fee?.toString() || "0",
      j.currency || "EUR",
      j.priority,
      j.created_at || "",
      j.delivered_at || "",
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deliveries_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalRevenue = filtered.filter(j => j.status === "completed").reduce((s, j) => s + (j.delivery_fee || 0), 0);

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }} />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par adresse, description…"
            className="h-9 text-xs pl-8"
            style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {["all", "pending", "assigned", "accepted", "in_progress", "completed", "cancelled"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="shrink-0 px-2.5 py-1 rounded-md text-[9px] font-semibold transition-all"
              style={{
                background: statusFilter === s ? "hsl(var(--hud-cyan) / 0.12)" : "hsl(var(--hud-surface))",
                color: statusFilter === s ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.5)",
              }}>
              {s === "all" ? "Tout" : STATUS_LABELS[s]?.split(" ")[0] || s}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="h-8 text-[10px]" placeholder="Du"
            style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="h-8 text-[10px]" placeholder="Au"
            style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
        </div>
      </div>

      {/* Summary + Export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
            {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
          </span>
          <span className="text-[10px] font-bold" style={{ color: "hsl(var(--success))" }}>
            {totalRevenue.toFixed(2)}€ CA
          </span>
        </div>
        <Button size="sm" className="text-[10px] h-7 px-3" onClick={exportCSV}
          disabled={filtered.length === 0}
          style={{ background: "hsl(var(--hud-cyan) / 0.12)", color: "hsl(var(--hud-cyan))" }}>
          <Download className="h-3 w-3 mr-1" /> CSV
        </Button>
      </div>

      {/* List */}
      <div className="space-y-1 max-h-72 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "hsl(var(--hud-cyan) / 0.3)" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-6 w-6 mx-auto mb-1" style={{ color: "hsl(var(--hud-text-dim) / 0.15)" }} />
            <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Aucun résultat</p>
          </div>
        ) : (
          filtered.map(job => (
            <div key={job.id} className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.06)" }}>
              <span className="text-[10px] shrink-0">{STATUS_LABELS[job.status]?.slice(0, 2) || "📦"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium truncate" style={{ color: "hsl(var(--hud-text))" }}>
                  {job.package_description || job.dropoff_address?.slice(0, 30)}
                </p>
                <p className="text-[9px] truncate" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                  {job.created_at ? new Date(job.created_at).toLocaleDateString("fr") : ""} • {job.priority}
                </p>
              </div>
              {job.delivery_fee != null && (
                <span className="text-[10px] font-bold shrink-0"
                  style={{ color: job.status === "completed" ? "hsl(var(--success))" : "hsl(var(--hud-text-dim))" }}>
                  {job.delivery_fee.toFixed(2)}€
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
