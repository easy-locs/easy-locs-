import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Download } from "lucide-react";
import jsPDF from "jspdf";

interface Tenant { id: string; name: string; property_id: string | null; rent_amount: number; charges_amount: number; }
interface Property { id: string; label: string; address: string; city: string; }
interface Notice { id: string; tenant_id: string; property_id: string | null; month: string; rent_amount: number; charges_amount: number; total_amount: number; due_date: string; sent: boolean; }

const PaymentNotices = () => {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!orgId) return;
    const [{ data: n }, { data: t }, { data: p }] = await Promise.all([
      supabase.from("payment_notices").select("*").eq("org_id", orgId).order("due_date", { ascending: false }),
      supabase.from("tenants").select("id, name, property_id, rent_amount, charges_amount").eq("org_id", orgId),
      supabase.from("properties").select("id, label, address, city").eq("org_id", orgId),
    ]);
    if (n) setNotices(n as Notice[]);
    if (t) setTenants(t as Tenant[]);
    if (p) setProperties(p as Property[]);
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
    if (newNotices.length === 0) { toast({ title: "Tous les avis du mois sont déjà créés" }); return; }
    const { error } = await supabase.from("payment_notices").insert(newNotices);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${newNotices.length} avis d'échéance généré(s)` });
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
    doc.text("AVIS D'ÉCHÉANCE", 20, 25);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Mois : ${notice.month}`, 20, 33);
    doc.text(`Date d'échéance : ${notice.due_date}`, 20, 39);

    let y = 55;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(26, 39, 68);
    doc.text("Locataire", 20, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    doc.text(tenant?.name || "—", 20, y + 7);

    if (property) {
      y += 20;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(26, 39, 68);
      doc.text("Bien", 20, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      doc.text(`${property.label} — ${property.address}, ${property.city}`, 20, y + 7);
    }

    y += 25;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(26, 39, 68);
    doc.text("Détail", 20, y);
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    doc.text(`Loyer : ${fmt(notice.rent_amount)}`, 20, y);
    doc.text(`Charges : ${fmt(notice.charges_amount)}`, 20, y + 7);
    doc.setFont("helvetica", "bold");
    doc.text(`Total à payer : ${fmt(notice.total_amount)}`, 20, y + 17);

    doc.setFillColor(26, 39, 68);
    doc.rect(0, 290, 210, 7, "F");
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text("Adminia — Avis d'échéance", 20, 287);

    doc.save(`avis_echeance_${notice.month}_${tenant?.name || ""}.pdf`);
  };

  const tenantName = (id: string) => tenants.find(t => t.id === id)?.name || "—";

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Avis d'échéance</h1>
            <p className="text-sm text-muted-foreground">Générez les avis de paiement mensuels</p>
          </div>
          <button onClick={generateNotices} className="flex items-center gap-2 bg-gradient-gold text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold shadow-gold hover:opacity-90">
            <Plus className="h-4 w-4" /> Générer le mois
          </button>
        </div>

        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border/50 bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mois</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Locataire</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Échéance</th>
              <th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Chargement…</td></tr> :
                notices.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Aucun avis</td></tr> :
                  notices.map(n => (
                    <tr key={n.id} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="px-4 py-3 text-foreground">{n.month}</td>
                      <td className="px-4 py-3 text-foreground font-medium">{tenantName(n.tenant_id)}</td>
                      <td className="px-4 py-3 text-right text-foreground font-semibold">{new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n.total_amount)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{n.due_date}</td>
                      <td className="px-4 py-3"><button onClick={() => downloadNoticePDF(n)} className="text-primary hover:text-primary/80"><Download className="h-4 w-4" /></button></td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PaymentNotices;
