import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ClipboardList, CheckCircle, Clock, Loader2, FileText, Receipt, Send, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  tenantId: string;
  tenantName: string;
}

const REQUEST_LABELS: Record<string, string> = {
  receipt: "Quittance de loyer",
  attestation: "Attestation de loyer",
  lease_copy: "Copie du bail",
  charges_detail: "Détail des charges",
};

const REQUEST_ACTIONS: Record<string, { label: string; icon: typeof Receipt; route?: string }> = {
  receipt: { label: "Générer quittance", icon: Receipt, route: "/dashboard/receipts" },
  attestation: { label: "Générer attestation", icon: FileText, route: "/dashboard/documents" },
  lease_copy: { label: "Voir le bail", icon: FileText, route: "/dashboard/leases" },
  charges_detail: { label: "Voir les charges", icon: FileText, route: "/dashboard/charges" },
};

const TenantRequestsPanel = ({ tenantId, tenantName }: Props) => {
  const { orgId } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const loadRequests = async () => {
    const { data } = await supabase
      .from("document_requests")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    setRequests(data || []);
    setLoading(false);
  };

  useEffect(() => { loadRequests(); }, [tenantId]);

  const handleResolve = async (requestId: string) => {
    setResolvingId(requestId);
    const { error } = await supabase
      .from("document_requests")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", requestId);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Demande traitée" });
      const { data: tenant } = await supabase.from("tenants").select("tenant_user_id").eq("id", tenantId).single();
      if (tenant?.tenant_user_id) {
        await supabase.from("notifications").insert({
          user_id: tenant.tenant_user_id,
          org_id: orgId,
          type: "document",
          title: "✅ Document disponible",
          message: `Votre bailleur a traité votre demande. Le document est disponible dans votre espace.`,
          link: "/tenant/documents",
        });
      }
      await loadRequests();
    }
    setResolvingId(null);
  };

  const handleAction = (requestType: string) => {
    const action = REQUEST_ACTIONS[requestType];
    if (action?.route) {
      navigate(action.route);
    }
  };

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (requests.length === 0) return null;

  const pending = requests.filter(r => r.status !== "resolved");
  const resolved = requests.filter(r => r.status === "resolved");

  return (
    <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-accent" />
        Demandes du locataire — {tenantName}
        {pending.length > 0 && (
          <span className="ml-auto text-xs font-bold bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
            {pending.length} en attente
          </span>
        )}
      </h3>

      {/* Pending requests with action buttons */}
      {pending.length > 0 && (
        <div className="space-y-3 mb-4">
          {pending.map((r) => {
            const action = REQUEST_ACTIONS[r.request_type];
            const ActionIcon = action?.icon || FileText;
            return (
              <div key={r.id} className="bg-warning/5 border border-warning/20 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{REQUEST_LABELS[r.request_type] || r.request_type}</p>
                      <p className="text-xs text-muted-foreground">{r.period || "—"} · {new Date(r.created_at).toLocaleDateString("fr-FR")}</p>
                      {r.notes && <p className="text-xs text-muted-foreground mt-1">{r.notes}</p>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 ml-12">
                  {action && (
                    <Button
                      size="sm"
                      variant="default"
                      className="bg-accent text-accent-foreground text-xs"
                      onClick={() => handleAction(r.request_type)}
                    >
                      <ActionIcon className="h-3.5 w-3.5 mr-1.5" />
                      {action.label}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => handleResolve(r.id)}
                    disabled={resolvingId === r.id}
                  >
                    {resolvingId === r.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle className="h-3.5 w-3.5 mr-1.5" />}
                    Marquer traité
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <div className="space-y-1.5">
          {resolved.slice(0, 5).map((r) => (
            <div key={r.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-success" />
                <div>
                  <p className="text-sm font-medium text-foreground">{REQUEST_LABELS[r.request_type] || r.request_type}</p>
                  <p className="text-xs text-muted-foreground">{r.period || "—"} · {new Date(r.created_at).toLocaleDateString("fr-FR")}</p>
                </div>
              </div>
              <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full">Traité</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TenantRequestsPanel;
