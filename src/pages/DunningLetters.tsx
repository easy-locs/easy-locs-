import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useCountryFilter } from "@/hooks/useCountryFilter";
import FeatureGate from "@/components/subscription/FeatureGate";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { fetchDunningData, createDunningLetter, sendDunningEmail } from "@/repositories/dunning.repository";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Download, Plus } from "lucide-react";
import jsPDF from "jspdf";
import { useI18n } from "@/lib/i18n";

const LEVELS = [
  { value: 1, labelKey: "page.dunning.level_1", toneKey: "page.dunning.tone_1" },
  { value: 2, labelKey: "page.dunning.level_2", toneKey: "page.dunning.tone_2" },
  { value: 3, labelKey: "page.dunning.level_3", toneKey: "page.dunning.tone_3" },
];

interface DunningLetter { id: string; tenant_id: string; property_id: string | null; level: number; month: string; amount_due: number; sent_at: string | null; created_at: string; }
interface Tenant { id: string; name: string; property_id: string | null; }
interface Property { id: string; label: string; address: string; city: string; }
interface RentCall { id: string; tenant_id: string; month: string; total_amount: number; paid: boolean; }

const DunningLetters = () => {
  const countryFilter = useCountryFilter();
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [letters, setLetters] = useState<DunningLetter[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [unpaid, setUnpaid] = useState<RentCall[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!orgId) return;
    const result = await fetchDunningData(orgId, countryFilter);
    setProperties(result.properties as Property[]);
    setTenants(result.tenants as Tenant[]);
    setLetters(result.letters as DunningLetter[]);
    setUnpaid(result.unpaid as RentCall[]);
    setLoading(false);
  }, [orgId, countryFilter]);

  useEffect(() => { load(); }, [load]);

  const createLetter = async (tenantId: string, month: string, amount: number, level: number) => {
    if (!orgId) return;
    const tenant = tenants.find(t => t.id === tenantId);
    try {
      await createDunningLetter(orgId, tenantId, tenant?.property_id || null, level, month, amount);
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" }); return;
    }
    toast({ title: t("page.dunning.created").replace("{level}", String(level)) });

    if (tenant?.id) {
      const levelInfo = LEVELS.find(l => l.value === level) || LEVELS[0];
      const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
      const levelLabel = t(levelInfo.labelKey);
      const levelTone = t(levelInfo.toneKey);
      await sendDunningEmail(tenant.id,
        `${level === 3 ? t("email.dunning_subject_3") : t("email.dunning_subject")} — ${month}`,
        `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="color:#1a1a1a;">⚠️ ${level === 3 ? t("email.dunning_subject_3") : levelLabel}</h2>
          <p style="color:#555;">${levelTone}</p>
          <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="color:#1a1a1a;"><strong>${t("email.dunning_month")} :</strong> ${month}</p>
            <p style="color:#1a1a1a;"><strong>${t("email.dunning_amount")} :</strong> ${fmt(amount)}</p>
          </div>
          <p style="color:#888;font-size:13px;">${t("email.dunning_footer")}</p>
        </div>`);
    }

    await load();
  };

  const downloadPDF = (letter: DunningLetter) => {
    const tenant = tenants.find(t => t.id === letter.tenant_id);
    const property = properties.find(p => p.id === letter.property_id);
    const levelInfo = LEVELS.find(l => l.value === letter.level) || LEVELS[0];
    const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
    const doc = new jsPDF();

    doc.setFillColor(212, 163, 74);
    doc.rect(0, 0, 210, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(26, 39, 68);
    doc.text(letter.level === 3 ? t("pdf.dunning_title_3") : `${t("pdf.dunning_title")} (${t(levelInfo.labelKey)})`, 20, 25);

    let y = 45;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    doc.text(`${t("pdf.date")} : ${new Date().toLocaleDateString("fr-FR")}`, 20, y);
    y += 10;
    doc.text(`${t("pdf.recipient")} : ${tenant?.name || "—"}`, 20, y);
    if (property) { y += 7; doc.text(`${t("pdf.property")} : ${property.label} — ${property.address}, ${property.city}`, 20, y); }
    y += 15;

    doc.text(`${t("pdf.subject_unpaid")} — ${letter.month}`, 20, y);
    y += 10;
    doc.text(`${t("pdf.salutation")} ${tenant?.name || ""},`, 20, y);
    y += 10;

    const lines = doc.splitTextToSize(t(levelInfo.toneKey) + ` ${t("pdf.amount_due")} ${fmt(letter.amount_due)} ${t("pdf.for_month")} ${letter.month}.`, 170);
    doc.text(lines, 20, y);
    y += lines.length * 5 + 10;

    doc.text(t("pdf.closing"), 20, y);
    y += 20;
    doc.setFont("helvetica", "bold");
    doc.text(t("pdf.landlord"), 20, y);

    doc.setFillColor(26, 39, 68);
    doc.rect(0, 290, 210, 7, "F");
    doc.save(`relance_${letter.level}_${letter.month}_${tenant?.name || ""}.pdf`);
  };

  const tenantName = (id: string) => tenants.find(t => t.id === id)?.name || "—";

  // Sort unpaid by month desc
  const sortedUnpaid = useMemo(() => 
    [...unpaid].sort((a, b) => b.month.localeCompare(a.month)),
  [unpaid]);

  return (
    <DashboardLayout>
      <FeatureGate feature="unlimited_tenants" featureLabel={t("page.dunning.title")}>
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="page-header mb-0">
            <h1>{t("page.dunning.title")}</h1>
            <p>{t("page.dunning.subtitle")}</p>
          </div>
        </motion.div>

        {/* Unpaid summary — each month shown individually */}
        {sortedUnpaid.length > 0 && (
          <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h3 className="font-semibold text-foreground">{t("page.dunning.unpaid_rents")}</h3>
            </div>
            <div className="space-y-2">
              {sortedUnpaid.map((call) => {
                const existingLetters = letters.filter(l => l.tenant_id === call.tenant_id && l.month === call.month);
                const maxLevel = existingLetters.length > 0 ? Math.max(...existingLetters.map(l => l.level)) : 0;
                const nextLevel = Math.min(maxLevel + 1, 3);
                return (
                  <div key={call.id} className="flex items-center justify-between bg-card rounded-lg p-3">
                    <div>
                      <p className="font-medium text-foreground">{tenantName(call.tenant_id)}</p>
                      <p className="text-xs text-muted-foreground">{call.month} · {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(call.total_amount)}</p>
                    </div>
                    <button onClick={() => createLetter(call.tenant_id, call.month, call.total_amount, nextLevel)} className="btn-destructive btn-sm">
                      <Plus className="h-3 w-3" /> {t(LEVELS.find(l => l.value === nextLevel)?.labelKey || "page.dunning.level_1")}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Letters history */}
        <div className="table-container">
          <div className="table-scroll">
            <table className="w-full text-sm min-w-[580px]">
               <thead><tr className="table-head-row">
                <th className="table-head-cell">{t("page.dunning.date")}</th>
                <th className="table-head-cell">{t("page.dunning.tenant")}</th>
                <th className="table-head-cell">{t("page.dunning.level")}</th>
                <th className="table-head-cell">{t("page.dunning.month")}</th>
                <th className="table-head-cell text-right">{t("page.dunning.amount")}</th>
                <th className="table-head-cell"></th>
              </tr></thead>
              <tbody>
                 {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{t("page.common.loading")}</td></tr> :
                  letters.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{t("page.dunning.no_letter")}</td></tr> :
                    letters.map(l => (
                      <tr key={l.id} className="table-body-row">
                        <td className="table-cell-muted whitespace-nowrap">{new Date(l.created_at || "").toLocaleDateString("fr-FR")}</td>
                        <td className="table-cell font-medium whitespace-nowrap">{tenantName(l.tenant_id)}</td>
                        <td className="table-cell"><span className={`badge-status ${l.level === 3 ? "badge-danger" : l.level === 2 ? "badge-warning" : "badge-info"}`}>{t(LEVELS.find(x => x.value === l.level)?.labelKey || "page.dunning.level_1")}</span></td>
                        <td className="table-cell-muted whitespace-nowrap">{l.month}</td>
                        <td className="table-cell-amount">{new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(l.amount_due)}</td>
                        <td className="table-cell-actions"><button onClick={() => downloadPDF(l)} className="btn-ghost btn-icon"><Download className="h-4 w-4" /></button></td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </FeatureGate>
    </DashboardLayout>
  );
};

// Need useMemo import
import { useMemo } from "react";

export default DunningLetters;
