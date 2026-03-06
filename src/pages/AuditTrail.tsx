import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { History, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const ACTION_LABELS: Record<string, string> = {
  "document.created": "📄 Document créé",
  "document.pdf_generated": "📑 PDF généré",
  "receipt.generated": "🧾 Quittance générée",
  "lease.created": "📝 Bail créé",
  "lease.signed": "✍️ Bail signé",
  "payment.received": "💰 Paiement reçu",
  "tenant.invited": "📩 Locataire invité",
  "property.created": "🏠 Bien ajouté",
  "intervention.created": "🔧 Intervention créée",
  "booking.created": "🏖️ Réservation créée",
  "webhook.delivered": "🔗 Webhook envoyé",
};

const AuditTrail = () => {
  const { orgId } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  useEffect(() => {
    if (!orgId) return;
    const fetchLogs = async () => {
      setLoading(true);
      let query = supabase.from("audit_logs").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(200);
      if (actionFilter) query = query.eq("action", actionFilter);
      const { data } = await query;
      setLogs(data || []);
      setLoading(false);
    };
    fetchLogs();
  }, [orgId, actionFilter]);

  const filteredLogs = search
    ? logs.filter(l => (ACTION_LABELS[l.action] || l.action).toLowerCase().includes(search.toLowerCase()) || JSON.stringify(l.metadata_json).toLowerCase().includes(search.toLowerCase()))
    : logs;

  const uniqueActions = [...new Set(logs.map(l => l.action))];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="page-header">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <History className="h-6 w-6" /> Journal d'audit
          </h1>
          <p className="text-sm text-muted-foreground">Historique complet des actions sur votre organisation</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
              className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
              className="bg-background border border-border rounded-lg pl-9 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none">
              <option value="">Toutes les actions</option>
              {uniqueActions.map(a => (
                <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Chargement...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <History className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Aucun événement trouvé</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map(log => (
              <div key={log.id} className="bg-card rounded-lg border border-border/50 p-4 flex items-start gap-4">
                <div className="text-2xl flex-shrink-0">
                  {(ACTION_LABELS[log.action] || "📋").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {ACTION_LABELS[log.action]?.slice(2).trim() || log.action}
                  </p>
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
      </div>
    </DashboardLayout>
  );
};

export default AuditTrail;
