import { useState, useEffect } from "react";
import FeatureGate from "@/components/subscription/FeatureGate";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DocumentBuilder from "@/components/documents/DocumentBuilder";
import { FileText, Download, Plus, Clock } from "lucide-react";
import { getDocuments, type GeneratedDocument } from "@/lib/store";
import { getTemplateById } from "@/lib/templates/registry";
import { frRentReceipt } from "@/lib/templates/fr/rent-receipt";
import { generateFromTemplate, downloadPDF } from "@/lib/pdf-generator";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const Receipts = () => {
  const { t } = useI18n();
  const { user, orgId } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [, setRefresh] = useState(0);
  const [landlordSignature, setLandlordSignature] = useState("");
  const [stampUrl, setStampUrl] = useState("");

  // Load landlord signature + company stamp on mount
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("signature_url").eq("id", user.id).single().then(({ data }) => {
      if (data?.signature_url) setLandlordSignature(data.signature_url);
    });
  }, [user]);

  useEffect(() => {
    if (!orgId) return;
    supabase.from("orgs").select("stamp_url").eq("id", orgId).single().then(({ data }) => {
      if ((data as any)?.stamp_url) setStampUrl((data as any).stamp_url);
    });
  }, [orgId]);

  const receipts = getDocuments().filter((d) => d.type === "rent-receipt");

  const handleDownload = (receipt: GeneratedDocument) => {
    if (receipt.pdfDataUri) {
      const link = document.createElement("a");
      link.href = receipt.pdfDataUri;
      link.download = `${receipt.title.replace(/\s/g, "_")}.pdf`;
      link.click();
    } else {
      const signatures = landlordSignature ? { landlord: landlordSignature } : undefined;
      const doc = generateFromTemplate(frRentReceipt, receipt.dataJson, signatures, stampUrl || undefined);
      downloadPDF(doc, `${receipt.title.replace(/\s/g, "_")}.pdf`);
    }
  };

  if (showForm) {
    return (
      <DocumentBuilder
        template={frRentReceipt}
        onBack={() => setShowForm(false)}
        onGenerated={() => { setShowForm(false); setRefresh((r) => r + 1); }}
      />
    );
  }

  return (
    <DashboardLayout>
       <FeatureGate feature="receipts" featureLabel={t("page.receipts.title")}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("page.receipts.title")}</h1>
            <p className="text-muted-foreground text-sm mt-1">{t("page.receipts.subtitle")}</p>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-gradient-gold text-accent-foreground font-semibold px-5 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity text-sm">
            <Plus className="h-4 w-4" /> {t("page.receipts.new")}
          </button>
        </div>

        {receipts.length > 0 ? (
          <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                     <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{t("page.receipts.tenant")}</th>
                     <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{t("page.receipts.period")}</th>
                     <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{t("page.receipts.amount")}</th>
                     <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">{t("page.receipts.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {receipts.map((r) => {
                    const data = r.dataJson;
                    const total = (Number(data.rentAmount) || 0) + (Number(data.chargesAmount) || 0);
                    return (
                      <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{String(data.tenantName || "—")}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{r.title}</td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{total.toLocaleString("fr-FR")} €</td>
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
