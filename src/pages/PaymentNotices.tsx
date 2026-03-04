import { useState, useEffect, useCallback } from "react";
import FeatureGate from "@/components/subscription/FeatureGate";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Download, AlertTriangle, CheckCircle, Clock, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import logoEasyloc from "@/assets/logo-easylocs.png";
import { useI18n } from "@/lib/i18n";

interface Tenant { id: string; name: string; property_id: string | null; rent_amount: number; charges_amount: number; }
interface Property { id: string; label: string; address: string; city: string; }
interface Notice { id: string; tenant_id: string; property_id: string | null; month: string; rent_amount: number; charges_amount: number; total_amount: number; due_date: string; sent: boolean; }
interface RentCall { id: string; tenant_id: string; month: string; total_amount: number; paid: boolean; }

const PaymentNotices = () => {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [rentCalls, setRentCalls] = useState<RentCall[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!orgId) return;
    const [{ data: n }, { data: t }, { data: p }, { data: rc }] = await Promise.all([
      supabase.from("payment_notices").select("*").eq("org_id", orgId).order("due_date", { ascending: false }),
      supabase.from("tenants").select("id, name, property_id, rent_amount, charges_amount").eq("org_id", orgId),
      supabase.from("properties").select("id, label, address, city").eq("org_id", orgId),
      supabase.from("rent_calls").select("id, tenant_id, month, total_amount, paid").eq("org_id", orgId).eq("paid", false),
    ]);
    if (n) setNotices(n as Notice[]);
    if (t) setTenants(t as Tenant[]);
    if (p) setProperties(p as Property[]);
    if (rc) setRentCalls(rc as RentCall[]);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const generateNotices = async () => {
    if (!orgId) return;
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const existingTenantIds = notices.filter(n => n.month === month).map(n => n.tenant_id);
    const newNotices = tenants
      .filter(t => t.rent_amount > 0 && !existingTenantIds.includes(t.id))
      .map(t => ({
        org_id: orgId, tenant_id: t.id, property_id: t.property_id,
        month, rent_amount: Number(t.rent_amount), charges_amount: Number(t.charges_amount),
        total_amount: Number(t.rent_amount) + Number(t.charges_amount),
        due_date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
      }));
    if (newNotices.length === 0) { toast({ title: t("page.notices.all_created") }); return; }
    const { error } = await supabase.from("payment_notices").insert(newNotices);
    if (error) { toast({ title: t("common.error"), description: error.message, variant: "destructive" }); return; }
    toast({ title: `${newNotices.length} ${t("page.notices.generated")}` });

    // Send email to each tenant for their notice
    const fmt2 = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
    for (const notice of newNotices) {
      const tenant = tenants.find(t => t.id === notice.tenant_id);
      if (!tenant) continue;
      const { data: tenantData } = await supabase.from("tenants").select("email").eq("id", tenant.id).single();
      if (tenantData?.email) {
        supabase.functions.invoke("send-email", {
          body: {
            to: tenantData.email,
            subject: `${t("email.notice_subject")} — ${notice.month}`,
            html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
              <h2 style="color:#1a1a1a;">${t("email.notice_title")}</h2>
              <p style="color:#555;">${t("email.notice_body").replace("{month}", notice.month)}</p>
              <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0;">
                <p style="color:#1a1a1a;"><strong>${t("pdf.rent")} :</strong> ${fmt2(notice.rent_amount)}</p>
                <p style="color:#1a1a1a;"><strong>${t("pdf.charges")} :</strong> ${fmt2(notice.charges_amount)}</p>
                <p style="color:#1a1a1a;"><strong>Total :</strong> ${fmt2(notice.total_amount)}</p>
                <p style="color:#1a1a1a;"><strong>${t("email.notice_due")} :</strong> ${notice.due_date}</p>
              </div>
              <p style="color:#888;font-size:13px;">${t("email.notice_footer")}</p>
            </div>`,
          },
        }).catch(() => {});
      }
    }

    await load();
  };

  const downloadNoticePDF = (notice: Notice) => {
    const tenant = tenants.find(t => t.id === notice.tenant_id);
    const property = properties.find(p => p.id === notice.property_id);
    const doc = new jsPDF();
    const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

    doc.setFillColor(212, 163, 74);
    doc.rect(0, 0, 210, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(26, 39, 68);
    doc.text(t("pdf.notice_title"), 20, 25);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`${t("pdf.notice_month")} : ${notice.month}`, 20, 33);
    doc.text(`${t("pdf.notice_due_date")} : ${notice.due_date}`, 20, 39);

    let y = 55;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(26, 39, 68);
    doc.text(t("pdf.tenant"), 20, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    doc.text(tenant?.name || "—", 20, y + 7);

    if (property) {
      y += 20;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(26, 39, 68);
      doc.text(t("pdf.property"), 20, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      doc.text(`${property.label} — ${property.address}, ${property.city}`, 20, y + 7);
    }

    y += 25;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(26, 39, 68);
    doc.text(t("pdf.detail"), 20, y);
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    doc.text(`${t("pdf.rent")} : ${fmt(notice.rent_amount)}`, 20, y);
    doc.text(`${t("pdf.charges")} : ${fmt(notice.charges_amount)}`, 20, y + 7);
    doc.setFont("helvetica", "bold");
    doc.text(`${t("pdf.total")} : ${fmt(notice.total_amount)}`, 20, y + 17);

    doc.setFillColor(26, 39, 68);
    doc.rect(0, 290, 210, 7, "F");
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(t("pdf.footer_notice"), 20, 287);

    doc.save(`avis_echeance_${notice.month}_${tenant?.name || ""}.pdf`);
  };

  const tenantName = (id: string) => tenants.find(t => t.id === id)?.name || "—";
  const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
  const unpaidTotal = rentCalls.reduce((s, c) => s + (c.total_amount || 0), 0);

  return (
    <DashboardLayout>
       <FeatureGate feature="unlimited_tenants" featureLabel={t("page.notices.title")}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("page.notices.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("page.notices.subtitle")}</p>
          </div>
          <button onClick={generateNotices} className="flex items-center gap-2 bg-gradient-gold text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold shadow-gold hover:opacity-90">
            <Plus className="h-4 w-4" /> {t("page.notices.generate")}
          </button>
        </div>

        {/* Unpaid alerts */}
        {rentCalls.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {rentCalls.length} {t("page.notices.unpaid_alert")} — {fmt(unpaidTotal)}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {rentCalls.slice(0, 5).map(c => (
                    <span key={c.id} className="text-xs bg-destructive/20 text-destructive px-2 py-1 rounded-full font-medium">
                      {tenantName(c.tenant_id)} · {c.month}
                    </span>
                  ))}
                  {rentCalls.length > 5 && (
                    <span className="text-xs text-muted-foreground">+{rentCalls.length - 5} {t("page.notices.others")}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
             <thead><tr className="border-b border-border/50 bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("page.notices.month")}</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("page.notices.tenant")}</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t("page.notices.total")}</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("page.notices.status")}</th>
              <th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
               {loading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{t("page.common.loading")}</td></tr> :
                notices.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{t("page.notices.no_notice")}</td></tr> :
                  notices.map(n => {
                    const isPaid = !rentCalls.some(c => c.tenant_id === n.tenant_id && c.month === n.month);
                    return (
                      <tr key={n.id} className="border-b border-border/30 hover:bg-muted/20">
                        <td className="px-4 py-3 text-foreground">{n.month}</td>
                        <td className="px-4 py-3 text-foreground font-medium">{tenantName(n.tenant_id)}</td>
                        <td className="px-4 py-3 text-right text-foreground font-semibold">{fmt(n.total_amount)}</td>
                        <td className="px-4 py-3">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
                              <CheckCircle className="h-3 w-3" /> {t("page.common.paid")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                              <Clock className="h-3 w-3" /> {t("page.common.unpaid")}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3"><button onClick={() => downloadNoticePDF(n)} className="text-primary hover:text-primary/80"><Download className="h-4 w-4" /></button></td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>
      </FeatureGate>
    </DashboardLayout>
  );
};

export default PaymentNotices;
