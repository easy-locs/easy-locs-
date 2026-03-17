import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { History, Search, Filter, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "@/lib/date-locales";
import { toast } from "sonner";

const ACTION_LABELS: Record<string, string> = {
  "document.created": "📄 Document créé",
  "document.pdf_generated": "📑 PDF généré",
  "document_routed": "📬 Document routé",
  "receipt.generated": "🧾 Quittance générée",
  "lease.created": "📝 Bail créé",
  "lease.signed": "✍️ Bail signé",
  "lease_activated_rent_schedule_pending": "✅ Bail activé",
  "payment.received": "💰 Paiement reçu",
  "tenant.invited": "📩 Locataire invité",
  "property.created": "🏠 Bien ajouté",
  "intervention.created": "🔧 Intervention créée",
  "booking.created": "🏖️ Réservation créée",
  "webhook.delivered": "🔗 Webhook envoyé",
  "listing_INSERT": "📢 Annonce créée",
  "listing_UPDATE": "✏️ Annonce modifiée",
  "listing_status_published": "🚀 Annonce publiée",
  "listing_status_paused": "⏸️ Annonce pausée",
  "listing_status_sold": "🎉 Annonce vendue",
  "listing_status_archived": "📦 Annonce archivée",
  "deal_status_offer_sent": "💰 Offre envoyée",
  "deal_status_accepted": "✅ Offre acceptée",
  "deal_status_confirmed": "🎉 Deal confirmé",
  "deal_status_cancelled": "❌ Deal annulé",
  "deal_payment_checkout_created": "💳 Checkout créé",
  "locs_transfer": "🪙 Transfert LOCS",
};

const ACTION_CATEGORIES: Record<string, string> = {
  document: "Documents",
  lease: "Baux",
  payment: "Paiements",
  property: "Biens",
  booking: "Réservations",
  listing: "Annonces",
  deal: "Deals",
  locs: "Wallet",
  tenant: "Locataires",
  intervention: "Interventions",
};

function getActionCategory(action: string): string {
  for (const [prefix, cat] of Object.entries(ACTION_CATEGORIES)) {
    if (action.toLowerCase().includes(prefix)) return cat;
  }
  return "Autre";
}

const PAGE_SIZE = 50;

const AuditTrail = () => {
  const { orgId } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(0);

  const fetchLogs = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);

    let query = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (actionFilter) query = query.eq("action", actionFilter);

    const { data, count } = await query;
    setLogs(data || []);
    setTotalCount(count || 0);
    setLoading(false);
  }, [orgId, actionFilter, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filteredLogs = logs.filter((l) => {
    const matchesSearch = !search ||
      (ACTION_LABELS[l.action] || l.action).toLowerCase().includes(search.toLowerCase()) ||
      JSON.stringify(l.metadata_json).toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || getActionCategory(l.action) === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const uniqueActions = [...new Set(logs.map((l) => l.action))];
  const categories = [...new Set(logs.map((l) => getActionCategory(l.action)))].sort();
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const exportCSV = () => {
    if (filteredLogs.length === 0) return;
    const header = "Date,Action,Catégorie,Détails\n";
    const rows = filteredLogs.map((l) => {
      const date = format(new Date(l.created_at), "yyyy-MM-dd HH:mm:ss");
      const action = (ACTION_LABELS[l.action] || l.action).replace(/[📄📑📬🧾📝✍️💰📩🏠🔧🏖️🔗📢✏️🚀⏸️🎉📦❌💳🪙✅]/g, "").trim();
      const category = getActionCategory(l.action);
      const details = l.metadata_json ? JSON.stringify(l.metadata_json).replace(/"/g, "'") : "";
      return `"${date}","${action}","${category}","${details}"`;
    }).join("\n");

    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-trail-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV téléchargé");
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <History className="h-6 w-6" /> Journal d'audit
            </h1>
            <p className="text-sm text-muted-foreground">
              {totalCount} événements enregistrés
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCSV}>
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…" className="pl-9" />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
          >
            <option value="">Toutes catégories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
            className="bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
          >
            <option value="">Toutes actions</option>
            {uniqueActions.map((a) => (
              <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>
            ))}
          </select>
        </div>

        {/* Category quick stats */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const count = filteredLogs.filter((l) => getActionCategory(l.action) === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(categoryFilter === cat ? "" : cat)}
                className="px-2.5 py-1 rounded-full text-[10px] font-medium transition-all"
                style={{
                  background: categoryFilter === cat ? "hsl(var(--primary) / 0.1)" : "hsl(var(--muted) / 0.5)",
                  color: categoryFilter === cat ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                  border: `1px solid ${categoryFilter === cat ? "hsl(var(--primary) / 0.2)" : "transparent"}`,
                }}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Log entries */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Chargement...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <History className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Aucun événement trouvé</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log) => (
              <div key={log.id} className="bg-card rounded-lg border border-border/50 p-4 flex items-start gap-4">
                <div className="text-2xl flex-shrink-0">
                  {(ACTION_LABELS[log.action] || "📋").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">
                      {ACTION_LABELS[log.action]?.slice(2).trim() || log.action}
                    </p>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                      {getActionCategory(log.action)}
                    </span>
                  </div>
                  {log.metadata_json && Object.keys(log.metadata_json).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Object.entries(log.metadata_json).slice(0, 4).map(([k, v]) => (
                        <span key={k} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                          {k}: {String(v).slice(0, 30)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <time className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                  {format(new Date(log.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                </time>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AuditTrail;
