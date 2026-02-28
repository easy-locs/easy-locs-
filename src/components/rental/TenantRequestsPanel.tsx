import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, CheckCircle, Clock, Loader2 } from "lucide-react";

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

const TenantRequestsPanel = ({ tenantId, tenantName }: Props) => {
  const { orgId } = useAuth();
  const { toast } = useToast();
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

      // Notify tenant
      const { data: tenant } = await supabase.from("tenants").select("tenant_user_id").eq("id", tenantId).single();
      if (tenant?.tenant_user_id) {
        await supabase.from("notifications").insert({
          user_id: tenant.tenant_user_id,
          org_id: orgId,
          type: "info",
          title: "Demande traitée",
          message: `Votre bailleur a traité votre demande de document.`,
          link: "/tenant/requests",
        });
      }

      await loadRequests();
    }
    setResolvingId(null);
  };

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (requests.length === 0) return null;

  return (
    <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-accent" />
        Demandes du locataire — {tenantName}
      </h3>
      <div className="space-y-2">
        {requests.map((r) => (
          <div key={r.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-3">
              {r.status === "resolved" ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <Clock className="h-4 w-4 text-warning" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">{REQUEST_LABELS[r.request_type] || r.request_type}</p>
                <p className="text-xs text-muted-foreground">{r.period || "—"} · {new Date(r.created_at).toLocaleDateString("fr-FR")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {r.status === "resolved" ? (
                <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full">Traité</span>
              ) : (
                <button
                  onClick={() => handleResolve(r.id)}
                  disabled={resolvingId === r.id}
                  className="text-xs font-medium text-accent hover:underline disabled:opacity-50 flex items-center gap-1"
                >
                  {resolvingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  Marquer traité
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TenantRequestsPanel;
