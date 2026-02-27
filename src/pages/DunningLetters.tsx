import { useState, useEffect, useCallback } from "react";
import FeatureGate from "@/components/subscription/FeatureGate";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Download, Plus } from "lucide-react";
import jsPDF from "jspdf";
import { useI18n } from "@/lib/i18n";

const LEVELS = [
  { value: 1, label: "1re relance", tone: "Nous vous rappelons que le loyer reste dû." },
  { value: 2, label: "2e relance", tone: "Malgré notre précédent courrier, le loyer reste impayé. Nous vous prions de régulariser dans les meilleurs délais." },
  { value: 3, label: "Mise en demeure", tone: "À défaut de régularisation sous 8 jours, nous nous verrons contraints d'engager les procédures légales." },
];

interface DunningLetter { id: string; tenant_id: string; property_id: string | null; level: number; month: string; amount_due: number; sent_at: string | null; created_at: string; }
interface Tenant { id: string; name: string; property_id: string | null; }
interface Property { id: string; label: string; address: string; city: string; }
interface RentCall { id: string; tenant_id: string; month: string; total_amount: number; paid: boolean; }

const DunningLetters = () => {
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
    const [{ data: d }, { data: t }, { data: p }, { data: r }] = await Promise.all([
      supabase.from("dunning_letters").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
      supabase.from("tenants").select("id, name, property_id").eq("org_id", orgId),
      supabase.from("properties").select("id, label, address, city").eq("org_id", orgId),
      supabase.from("rent_calls").select("id, tenant_id, month, total_amount, paid").eq("org_id", orgId).eq("paid", false),
    ]);
    if (d) setLetters(d as DunningLetter[]);
    if (t) setTenants(t as Tenant[]);
    if (p) setProperties(p as Property[]);
    if (r) setUnpaid(r as RentCall[]);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const createLetter = async (tenantId: string, month: string, amount: number, level: number) => {
    if (!orgId) return;
    const tenant = tenants.find(t => t.id === tenantId);
    const { error } = await supabase.from("dunning_letters").insert({
      org_id: orgId, tenant_id: tenantId, property_id: tenant?.property_id || null,
      level, month, amount_due: amount,
    });
    if (error) { toast({ title: t("common.error"), description: error.message, variant: "destructive" }); return; }
    toast({ title: t("page.dunning.created").replace("{level}", String(level)) });

    // Send email notification to tenant
    if (tenant?.id) {
      const { data: tenantData } = await supabase.from("tenants").select("email, name").eq("id", tenant.id).single();
      if (tenantData?.email) {
        const levelInfo = LEVELS.find(l => l.value === level) || LEVELS[0];
        const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
        supabase.functions.invoke("send-email", {
          body: {
            to: tenantData.email,
            subject: `${level === 3 ? "Mise en demeure" : "Relance de loyer"} — ${month}`,
            html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
              <h2 style="color:#1a1a1a;">⚠️ ${level === 3 ? "Mise en demeure" : levelInfo.label}</h2>
              <p style="color:#555;">${levelInfo.tone}</p>
              <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0;">
                <p style="color:#1a1a1a;"><strong>Mois :</strong> ${month}</p>
                <p style="color:#1a1a1a;"><strong>Montant dû :</strong> ${fmt(amount)}</p>
              </div>
              <p style="color:#888;font-size:13px;">Connectez-vous à votre espace locataire pour plus de détails.</p>
            </div>`,
          },
        }).catch(() => {});
      }
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
    doc.text(letter.level === 3 ? "MISE EN DEMEURE" : `RELANCE DE LOYER IMPAYÉ (${levelInfo.label})`, 20, 25);

    let y = 45;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    doc.text(`Date : ${new Date().toLocaleDateString("fr-FR")}`, 20, y);
    y += 10;
    doc.text(`Destinataire : ${tenant?.name || "—"}`, 20, y);
    if (property) { y += 7; doc.text(`Bien : ${property.label} — ${property.address}, ${property.city}`, 20, y); }
    y += 15;

    doc.text(`Objet : Loyer impayé — ${letter.month}`, 20, y);
    y += 10;
    doc.text(`Madame, Monsieur ${tenant?.name || ""},`, 20, y);
    y += 10;

    const lines = doc.splitTextToSize(levelInfo.tone + ` Le montant dû s'élève à ${fmt(letter.amount_due)} pour le mois de ${letter.month}.`, 170);
    doc.text(lines, 20, y);
    y += lines.length * 5 + 10;

    doc.text("Veuillez agréer nos salutations distinguées.", 20, y);
    y += 20;
    doc.setFont("helvetica", "bold");
    doc.text("Le bailleur", 20, y);

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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("page.dunning.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("page.dunning.subtitle")}</p>
          </div>
        </div>

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
                    <button onClick={() => createLetter(call.tenant_id, call.month, call.total_amount, nextLevel)} className="flex items-center gap-2 bg-destructive text-destructive-foreground px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90">
                      <Plus className="h-3 w-3" /> {LEVELS.find(l => l.value === nextLevel)?.label}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Letters history */}
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
             <thead><tr className="border-b border-border/50 bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("page.dunning.date")}</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("page.dunning.tenant")}</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("page.dunning.level")}</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("page.dunning.month")}</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t("page.dunning.amount")}</th>
              <th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
               {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{t("page.common.loading")}</td></tr> :
                letters.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{t("page.dunning.no_letter")}</td></tr> :
                  letters.map(l => (
                    <tr key={l.id} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="px-4 py-3 text-muted-foreground">{new Date(l.created_at || "").toLocaleDateString("fr-FR")}</td>
                      <td className="px-4 py-3 text-foreground font-medium">{tenantName(l.tenant_id)}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${l.level === 3 ? "bg-destructive/10 text-destructive" : l.level === 2 ? "bg-warning/10 text-warning" : "bg-blue-500/10 text-blue-500"}`}>{LEVELS.find(x => x.value === l.level)?.label}</span></td>
                      <td className="px-4 py-3 text-muted-foreground">{l.month}</td>
                      <td className="px-4 py-3 text-right text-foreground font-semibold">{new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(l.amount_due)}</td>
                      <td className="px-4 py-3"><button onClick={() => downloadPDF(l)} className="text-primary hover:text-primary/80"><Download className="h-4 w-4" /></button></td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
      </FeatureGate>
    </DashboardLayout>
  );
};

// Need useMemo import
import { useMemo } from "react";

export default DunningLetters;
