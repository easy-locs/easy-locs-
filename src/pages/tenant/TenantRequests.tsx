import { useState, useEffect } from "react";
import { FileText, Receipt, Home, Shield, Clock, CheckCircle, Loader2 } from "lucide-react";
import TenantLayout from "@/components/tenant/TenantLayout";
import { useAuth } from "@/contexts/AuthContext";
import * as tenantRepo from "@/repositories/tenant-portal.repository";
import { useToast } from "@/hooks/use-toast";
import { useTenantProperty } from "@/hooks/useTenantProperty";
import { getCountryConfig } from "@/lib/country-config";

const TenantRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { tenantId, tenantName, orgId, propertyCountry, T } = useTenantProperty();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [period, setPeriod] = useState("");

  const REQUEST_TYPES = [
    { value: "receipt", label: T.requestReceipt, icon: Receipt, description: T.requestReceiptDesc },
    { value: "attestation", label: T.requestAttestation, icon: Shield, description: T.requestAttestationDesc },
    { value: "lease_copy", label: T.requestLeaseCopy, icon: FileText, description: T.requestLeaseCopyDesc },
    { value: "charges_detail", label: T.requestCharges, icon: Home, description: T.requestChargesDesc },
  ];

  useEffect(() => {
    if (!tenantId) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("document_requests")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      setRequests(data || []);
      setLoading(false);
    };
    fetch();
  }, [tenantId]);

  const handleRequest = async (type: string) => {
    if (!tenantId || !orgId || !user) return;
    setSubmitting(type);

    try {
      await tenantRepo.insertDocumentRequest(tenantId, orgId, type, period || null);
      toast({ title: T.requestSent, description: T.requestSentDesc });
      const orgData = await tenantRepo.fetchOrgOwnerInfo(orgId);
      if (orgData) {
        const label = REQUEST_TYPES.find(r => r.value === type)?.label || type;
        const L = getCountryConfig(propertyCountry).labels;
        await tenantRepo.insertNotification({
          user_id: orgData.owner_user_id,
          scope: "global",
          category: "request",
          title: `📋 ${T.requestSent}: ${label}`,
          body: `${tenantName || L.tenant} — ${label}${period ? ` (${period})` : ""}`,
          severity: "info",
          route: "/dashboard/rental?tab=tenants",
        });
        if (orgData.email) {
          tenantRepo.invokeEmail({
            to: orgData.email,
            subject: `${T.requestSent}: ${label}`,
            html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
              <h2 style="color:#1a1a1a;">📋 ${T.requestsTitle}</h2>
              <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0;">
                <p style="color:#1a1a1a;"><strong>${label}</strong></p>
                ${period ? `<p style="color:#1a1a1a;">${T.periodLabel}: ${period}</p>` : ""}
              </div>
            </div>`,
          }).catch(() => {});
        }
      }
      const data = await tenantRepo.fetchDocumentRequests(tenantId);
      setRequests(data);
      setPeriod("");
    }
    setSubmitting(null);
  };

  const dateLocale = getCountryConfig(propertyCountry).locale;

  return (
    <TenantLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">{T.requestsTitle}</h1>
        <p className="text-muted-foreground mb-6">{T.requestsSubtitle}</p>

        <div className="bg-card rounded-xl p-4 shadow-card border border-border/50 mb-4">
          <label className="block text-sm font-medium text-foreground mb-1.5">{T.periodLabel}</label>
          <input
            type="text"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="ex: 2026-03, Mars 2026..."
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]"
          />
        </div>

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

        <h2 className="text-lg font-semibold text-foreground mb-3">{T.history}</h2>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : requests.length === 0 ? (
          <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">{T.noRequest}</p>
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
                    {r.period || "—"} · {new Date(r.created_at).toLocaleDateString(dateLocale)}
                  </p>
                </div>
                <span className={`inline-flex items-center justify-center whitespace-nowrap h-6 text-xs px-2.5 rounded-full font-medium ${r.status === "resolved" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                  {r.status === "resolved" ? T.statusResolved : T.statusPending}
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
