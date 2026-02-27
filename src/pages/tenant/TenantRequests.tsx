import { useState, useEffect } from "react";
import { FileText, Receipt, Home, Shield, Clock, CheckCircle, Loader2 } from "lucide-react";
import TenantLayout from "@/components/tenant/TenantLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const REQUEST_TYPES = [
  { value: "receipt", label: "Quittance de loyer", icon: Receipt, description: "Demander une quittance pour un mois donné" },
  { value: "attestation", label: "Attestation de loyer", icon: Shield, description: "Pour vos démarches administratives (CAF, etc.)" },
  { value: "lease_copy", label: "Copie du bail", icon: FileText, description: "Obtenir une copie de votre contrat de location" },
  { value: "charges_detail", label: "Détail des charges", icon: Home, description: "Demander le décompte détaillé des charges" },
];

const TenantRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [period, setPeriod] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, org_id")
        .eq("tenant_user_id", user.id)
        .limit(1)
        .single();
      if (!tenant) { setLoading(false); return; }
      setTenantId(tenant.id);
      setOrgId(tenant.org_id);
      const { data } = await supabase
        .from("document_requests")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });
      setRequests(data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const handleRequest = async (type: string) => {
    if (!tenantId || !orgId || !user) return;
    setSubmitting(type);

    const { error } = await supabase.from("document_requests").insert({
      tenant_id: tenantId,
      org_id: orgId,
      request_type: type,
      period: period || null,
    });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Demande envoyée", description: "Votre bailleur a été notifié." });
      // Notify landlord (notification + email)
      const { data: orgData } = await supabase.from("orgs").select("owner_user_id, email").eq("id", orgId).single();
      if (orgData) {
        const label = REQUEST_TYPES.find(r => r.value === type)?.label || type;
        await supabase.from("notifications").insert({
          user_id: orgData.owner_user_id,
          org_id: orgId,
          type: "request",
          title: "Nouvelle demande locataire",
          message: `Demande de : ${label}${period ? ` (${period})` : ""}`,
          link: "/dashboard/messages",
        });
        // Send email to landlord
        if (orgData.email) {
          supabase.functions.invoke("send-email", {
            body: {
              to: orgData.email,
              subject: `Nouvelle demande locataire : ${label}`,
              html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
                <h2 style="color:#1a1a1a;">📋 Demande de document</h2>
                <p style="color:#555;">Un locataire a fait une demande :</p>
                <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0;">
                  <p style="color:#1a1a1a;"><strong>Type :</strong> ${label}</p>
                  ${period ? `<p style="color:#1a1a1a;"><strong>Période :</strong> ${period}</p>` : ""}
                </div>
                <p style="color:#888;font-size:13px;">Connectez-vous à votre tableau de bord pour traiter cette demande.</p>
              </div>`,
            },
          }).catch(() => {});
        }
      }
      // Refresh
      const { data } = await supabase
        .from("document_requests")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      setRequests(data || []);
      setPeriod("");
    }
    setSubmitting(null);
  };

  return (
    <TenantLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Demandes de documents</h1>
        <p className="text-muted-foreground mb-6">Faites une demande rapide à votre bailleur.</p>

        {/* Period input */}
        <div className="bg-card rounded-xl p-4 shadow-card border border-border/50 mb-4">
          <label className="block text-sm font-medium text-foreground mb-1.5">Période concernée (optionnel)</label>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Ex: 2026-01"
          />
        </div>

        {/* Quick request buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {REQUEST_TYPES.map((rt) => (
            <button
              key={rt.value}
              onClick={() => handleRequest(rt.value)}
              disabled={submitting === rt.value || !tenantId}
              className="flex items-start gap-3 bg-card rounded-xl p-4 shadow-card border border-border/50 hover:border-accent/50 hover:shadow-card-hover transition-all text-left disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                {submitting === rt.value ? (
                  <Loader2 className="h-5 w-5 text-accent animate-spin" />
                ) : (
                  <rt.icon className="h-5 w-5 text-accent" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{rt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{rt.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* History */}
        <h2 className="text-lg font-semibold text-foreground mb-3">Historique</h2>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : requests.length === 0 ? (
          <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Aucune demande effectuée.</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl shadow-card border border-border/50 divide-y divide-border">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  {r.status === "resolved" ? (
                    <CheckCircle className="h-5 w-5 text-success" />
                  ) : (
                    <Clock className="h-5 w-5 text-warning" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {REQUEST_TYPES.find((rt) => rt.value === r.request_type)?.label || r.request_type}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.period || "—"} · {new Date(r.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${r.status === "resolved" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                  {r.status === "resolved" ? "Traité" : "En attente"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </TenantLayout>
  );
};

export default TenantRequests;
