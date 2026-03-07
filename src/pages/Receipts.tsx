import { useState, useEffect } from "react";
import FeatureGate from "@/components/subscription/FeatureGate";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DocumentBuilder from "@/components/documents/DocumentBuilder";
import { FileText, Download, Plus, Clock, User, AlertTriangle } from "lucide-react";
import { frRentReceipt } from "@/lib/templates/fr/rent-receipt";
import { generateFromTemplate, downloadPDF } from "@/lib/pdf-generator";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/country-config";
import type { Json } from "@/integrations/supabase/types";

interface DBDocument {
  id: string;
  title: string;
  doc_type: string;
  data_json: Json;
  created_at: string;
}

const Receipts = () => {
  const { t } = useI18n();
  const { user, orgId, userCountry } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [receipts, setReceipts] = useState<DBDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [landlordSignature, setLandlordSignature] = useState("");
  const [stampUrl, setStampUrl] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");

  // Load receipts from DB
  const loadReceipts = async () => {
    if (!orgId) return;
    const { data } = await supabase
      .from("documents")
      .select("id, title, doc_type, data_json, created_at")
      .eq("org_id", orgId)
      .eq("doc_type", "rent-receipt")
      .order("created_at", { ascending: false });
    setReceipts((data as DBDocument[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadReceipts(); }, [orgId]);

  // Load landlord signature + owner info + stamp on mount
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("signature_url, name").eq("id", user.id).single().then(({ data }) => {
      if (data?.signature_url) setLandlordSignature(data.signature_url);
      if (data?.name) setOwnerName(data.name);
    });
  }, [user]);

  useEffect(() => {
    if (!orgId) return;
    // Load org stamp
    supabase.from("orgs").select("stamp_url").eq("id", orgId).single().then(({ data }) => {
      if ((data as any)?.stamp_url) setStampUrl((data as any).stamp_url);
    });
    // Load owner profile for name/address
    supabase.from("owner_profiles").select("full_name, address, postal_code, city").eq("org_id", orgId).limit(1).single().then(({ data }) => {
      if (data) {
        setOwnerName(data.full_name || "");
        setOwnerAddress([data.address, data.postal_code, data.city].filter(Boolean).join(", "));
      }
    });
  }, [orgId]);

  // Check if receipt can be generated (from 25th of month, one per tenant per month)
  const canGenerateReceipt = () => {
    const now = new Date();
    return now.getDate() >= 25;
  };

  const handleDownload = (receipt: DBDocument) => {
    const data = receipt.data_json as Record<string, unknown>;
    // Inject owner info if not present
    if (!data.landlordName && ownerName) data.landlordName = ownerName;
    if (!data.landlordAddress && ownerAddress) data.landlordAddress = ownerAddress;
    const signatures = landlordSignature ? { landlord: landlordSignature } : undefined;
    const doc = generateFromTemplate(frRentReceipt, data, signatures, stampUrl || undefined, { skipTenantSignature: true });
    downloadPDF(doc, `${receipt.title.replace(/\s/g, "_")}.pdf`);
  };

  const handleGenerated = () => {
    setShowForm(false);
    loadReceipts();
  };

  // Manual receipt form removed — receipts are generated automatically from payments

  return (
    <DashboardLayout>
       <FeatureGate feature="receipts" featureLabel={t("page.receipts.title")}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("page.receipts.title")}</h1>
            <p className="text-muted-foreground text-sm mt-1">{t("page.receipts.subtitle")}</p>
          </div>
        </div>

        {/* Owner info banner */}
        {ownerName && (
          <div className="flex items-center gap-3 bg-muted/30 border border-border/50 rounded-lg px-4 py-2.5 mb-6">
            <User className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t("page.receipts.owner")}: <span className="font-medium text-foreground">{ownerName}</span>
              {ownerAddress && <span className="text-muted-foreground"> — {ownerAddress}</span>}
            </p>
          </div>
        )}

        {!ownerName && (
          <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-2.5 mb-6">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{t("page.receipts.no_owner")}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">{t("page.common.loading")}</div>
        ) : receipts.length > 0 ? (
          <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[580px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                     <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{t("page.receipts.tenant")}</th>
                     <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{t("page.receipts.owner")}</th>
                     <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{t("page.receipts.period")}</th>
                     <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{t("page.receipts.amount")}</th>
                     <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">{t("page.receipts.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {receipts.map((r) => {
                    const data = r.data_json as Record<string, unknown>;
                    const total = (Number(data.rentAmount) || 0) + (Number(data.chargesAmount) || 0);
                    return (
                      <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{String(data.tenantName || "—")}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{String(data.landlordName || ownerName || "—")}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{r.title}</td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground currency-value whitespace-nowrap">{formatCurrency(total, userCountry)}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleDownload(r)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                            <Download className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-xl shadow-card border border-border/50 p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">{t("page.receipts.empty")}</p>
          </div>
        )}
      </div>
      </FeatureGate>
    </DashboardLayout>
  );
};

export default Receipts;
