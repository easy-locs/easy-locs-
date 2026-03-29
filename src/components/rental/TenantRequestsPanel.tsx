import { useState, useEffect } from "react";
import { resolveDocumentRequest, fetchTenantUserId } from "@/repositories/rental.repository";
import { insertAppNotification } from "@/repositories/communication.repository";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { ClipboardList, CheckCircle, Clock, Loader2, FileText, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  tenantId: string;
  tenantName: string;
}

const TenantRequestsPanel = ({ tenantId, tenantName }: Props) => {
  const { orgId } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const REQUEST_LABELS: Record<string, string> = {
    receipt: t("comp.requests.receipt"),
    attestation: t("comp.requests.attestation"),
    lease_copy: t("comp.requests.lease_copy"),
    charges_detail: t("comp.requests.charges_detail"),
  };

  const REQUEST_ACTIONS: Record<string, { label: string; icon: typeof Receipt; route?: string }> = {
    receipt: { label: t("comp.requests.gen_receipt"), icon: Receipt, route: "/dashboard/receipts" },
    attestation: { label: t("comp.requests.gen_attestation"), icon: FileText, route: "/dashboard/documents" },
    lease_copy: { label: t("comp.requests.view_lease"), icon: FileText, route: "/dashboard/leases" },
    charges_detail: { label: t("comp.requests.view_charges"), icon: FileText, route: "/dashboard/charges" },
  };

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
    try {
      await resolveDocumentRequest(requestId);
      toast({ title: t("comp.requests.resolved") });
      const tenantUserId = await fetchTenantUserId(tenantId);
      if (tenantUserId) {
        await insertAppNotification({
          user_id: tenantUserId,
          org_id: orgId,
          type: "document",
          title: t("comp.requests.doc_available_notif"),
          message: t("comp.requests.doc_available_msg"),
          link: "/tenant/documents",
        });
      }
      await loadRequests();
    } catch (error: any) {
      toast({ title: t("page.common.error"), description: error?.message, variant: "destructive" });
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
        {t("comp.requests.title")} — {tenantName}
        {pending.length > 0 && (
          <span className="ml-auto text-xs font-bold bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
            {pending.length} {t("comp.requests.pending_count")}
          </span>
        )}
      </h3>

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
                      <p className="text-xs text-muted-foreground">{r.period || "—"} · {new Date(r.created_at).toLocaleDateString()}</p>
                      {r.notes && <p className="text-xs text-muted-foreground mt-1">{r.notes}</p>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 ml-12">
                  {action && (
                    <Button size="sm" variant="default" className="bg-accent text-accent-foreground text-xs" onClick={() => handleAction(r.request_type)}>
                      <ActionIcon className="h-3.5 w-3.5 mr-1.5" />
                      {action.label}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => handleResolve(r.id)} disabled={resolvingId === r.id}>
                    {resolvingId === r.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle className="h-3.5 w-3.5 mr-1.5" />}
                    {t("comp.requests.mark_resolved")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="space-y-1.5">
          {resolved.slice(0, 5).map((r) => (
            <div key={r.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-success" />
                <div>
                  <p className="text-sm font-medium text-foreground">{REQUEST_LABELS[r.request_type] || r.request_type}</p>
                  <p className="text-xs text-muted-foreground">{r.period || "—"} · {new Date(r.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full">{t("comp.requests.resolved_label")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TenantRequestsPanel;
