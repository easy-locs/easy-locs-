import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DocumentBuilder from "@/components/documents/DocumentBuilder";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getDocuments, type GeneratedDocument } from "@/lib/store";
import { getTemplatesByCategory, getTemplateById } from "@/lib/templates/registry";
import { frRentReceipt } from "@/lib/templates/fr/rent-receipt";
import { generateFromTemplate, downloadPDF } from "@/lib/pdf-generator";
import type { DocumentTemplate } from "@/lib/templates/types";
import {
  Home, FileText, ChevronRight, Plus, Users, Send, X,
  Phone, MapPin, Calendar, Upload, MessageSquare, Download,
  Receipt, ClipboardList, TrendingUp, AlertTriangle, Building,
  Eye, Trash2, Euro, UserPlus
} from "lucide-react";

/* ─── Types ─── */
interface Tenant {
  id: string; name: string; email: string; phone: string; address: string;
  lease_start: string; lease_end: string; rent_amount: number; charges_amount: number; notes: string;
  deposit_amount: number; lease_type: string;
}
interface TenantMessage { id: string; from: string; content: string; created_at: string; }
interface Payment { id: string; tenant_id: string; month: string; amount: number; paid: boolean; paid_date?: string; }

type Tab = "dashboard" | "tenants" | "documents" | "payments";

/* ─── Component ─── */
const RentalManagement = () => {
  const { orgId } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantTab, setTenantTab] = useState<"info" | "messages" | "documents">("info");
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  // Data
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [messages, setMessages] = useState<TenantMessage[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [form, setForm] = useState<Omit<Tenant, "id">>({
    name: "", email: "", phone: "", address: "",
    lease_start: "", lease_end: "", rent_amount: 0, charges_amount: 0,
    notes: "", deposit_amount: 0, lease_type: "empty",
  });

  // Storage keys
  const sKey = `adminia_tenants_${orgId}`;
  const pKey = `adminia_payments_${orgId}`;
  const mKey = (tid: string) => `adminia_tenant_msgs_${orgId}_${tid}`;

  useEffect(() => {
    if (!orgId) return;
    const t = localStorage.getItem(sKey);
    if (t) setTenants(JSON.parse(t));
    const p = localStorage.getItem(pKey);
    if (p) setPayments(JSON.parse(p));
  }, [orgId, sKey, pKey]);

  const saveTenants = useCallback((t: Tenant[]) => { setTenants(t); localStorage.setItem(sKey, JSON.stringify(t)); }, [sKey]);
  const savePayments = useCallback((p: Payment[]) => { setPayments(p); localStorage.setItem(pKey, JSON.stringify(p)); }, [pKey]);
  const loadMessages = useCallback((tid: string) => { const s = localStorage.getItem(mKey(tid)); setMessages(s ? JSON.parse(s) : []); }, [orgId]);

  // Templates
  const rentalTemplates = getTemplatesByCategory("rental", "FR");

  // Receipts from store
  const receipts = getDocuments().filter((d) => d.type === "rent-receipt");

  // Stats
  const totalRent = tenants.reduce((s, t) => s + (t.rent_amount || 0), 0);
  const unpaidCount = payments.filter(p => !p.paid).length;
  const occupiedProperties = tenants.length;

  /* ─── Handlers ─── */
  const handleAddTenant = () => {
    if (!form.name.trim()) { toast({ title: "Erreur", description: "Le nom est requis", variant: "destructive" }); return; }
    if (editingTenant) {
      saveTenants(tenants.map(t => t.id === editingTenant.id ? { ...editingTenant, ...form } : t));
      toast({ title: "Locataire modifié" });
    } else {
      saveTenants([...tenants, { id: crypto.randomUUID(), ...form }]);
      toast({ title: "Locataire ajouté" });
    }
    resetForm();
  };

  const resetForm = () => {
    setForm({ name: "", email: "", phone: "", address: "", lease_start: "", lease_end: "", rent_amount: 0, charges_amount: 0, notes: "", deposit_amount: 0, lease_type: "empty" });
    setShowTenantForm(false);
    setEditingTenant(null);
  };

  const handleDeleteTenant = (id: string) => {
    saveTenants(tenants.filter(t => t.id !== id));
    if (selectedTenant?.id === id) setSelectedTenant(null);
    toast({ title: "Locataire supprimé" });
  };

  const handleEditTenant = (t: Tenant) => {
    setEditingTenant(t);
    setForm({ name: t.name, email: t.email, phone: t.phone, address: t.address, lease_start: t.lease_start, lease_end: t.lease_end, rent_amount: t.rent_amount, charges_amount: t.charges_amount || 0, notes: t.notes, deposit_amount: t.deposit_amount || 0, lease_type: t.lease_type || "empty" });
    setShowTenantForm(true);
    setSelectedTenant(null);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedTenant) return;
    const msg: TenantMessage = { id: crypto.randomUUID(), from: "owner", content: newMessage, created_at: new Date().toISOString() };
    const updated = [...messages, msg];
    setMessages(updated);
    localStorage.setItem(mKey(selectedTenant.id), JSON.stringify(updated));
    setNewMessage("");
  };

  const togglePayment = (paymentId: string) => {
    savePayments(payments.map(p => p.id === paymentId ? { ...p, paid: !p.paid, paid_date: !p.paid ? new Date().toISOString() : undefined } : p));
  };

  const generateMonthlyPayments = () => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const existing = payments.filter(p => p.month === month);
    const newPayments: Payment[] = [];
    for (const t of tenants) {
      if (!existing.some(p => p.tenant_id === t.id) && t.rent_amount > 0) {
        newPayments.push({ id: crypto.randomUUID(), tenant_id: t.id, month, amount: t.rent_amount + (t.charges_amount || 0), paid: false });
      }
    }
    if (newPayments.length > 0) {
      savePayments([...payments, ...newPayments]);
      toast({ title: `${newPayments.length} appel(s) de loyer généré(s)` });
    } else {
      toast({ title: "Tous les appels du mois sont déjà créés" });
    }
  };

  const handleDownloadReceipt = (receipt: GeneratedDocument) => {
    if (receipt.pdfDataUri) {
      const link = document.createElement("a"); link.href = receipt.pdfDataUri;
      link.download = `${receipt.title.replace(/\s/g, "_")}.pdf`; link.click();
    } else {
      const doc = generateFromTemplate(frRentReceipt, receipt.dataJson);
      downloadPDF(doc, `${receipt.title.replace(/\s/g, "_")}.pdf`);
    }
  };

  /* ─── Document Builder mode ─── */
  if (selectedTemplate) {
    return (
      <DocumentBuilder
        template={selectedTemplate}
        onBack={() => setSelectedTemplate(null)}
        onGenerated={() => setSelectedTemplate(null)}
      />
    );
  }

  /* ─── Tenant detail mode ─── */
  if (selectedTenant) {
    const tenantPayments = payments.filter(p => p.tenant_id === selectedTenant.id);
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <button onClick={() => setSelectedTenant(null)} className="text-sm text-accent hover:underline mb-4 flex items-center gap-1">← Retour</button>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center">
              <span className="text-lg font-bold text-accent-foreground">{selectedTenant.name[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">{selectedTenant.name}</h1>
              <p className="text-sm text-muted-foreground">{selectedTenant.address || "Aucune adresse"}</p>
            </div>
            <button onClick={() => handleEditTenant(selectedTenant)} className="text-xs text-accent hover:underline">Modifier</button>
          </div>

          <div className="flex gap-1 mb-6 bg-muted/50 rounded-lg p-1">
            {([
              { key: "info", label: "Fiche", icon: FileText },
              { key: "messages", label: "Échanges", icon: MessageSquare },
              { key: "documents", label: "Documents", icon: Upload },
            ] as const).map((tab) => (
              <button key={tab.key} onClick={() => setTenantTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${tenantTab === tab.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                <tab.icon className="h-4 w-4" />{tab.label}
              </button>
            ))}
          </div>

          {tenantTab === "info" && (
            <div className="space-y-4">
              <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div><span className="text-xs text-muted-foreground">Email</span><p className="font-medium text-foreground">{selectedTenant.email || "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Téléphone</span><p className="font-medium text-foreground">{selectedTenant.phone || "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Type de bail</span><p className="font-medium text-foreground">{selectedTenant.lease_type === "furnished" ? "Meublé" : selectedTenant.lease_type === "commercial" ? "Commercial" : "Vide"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Adresse du bien</span><p className="font-medium text-foreground">{selectedTenant.address || "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Début du bail</span><p className="font-medium text-foreground">{selectedTenant.lease_start || "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Fin du bail</span><p className="font-medium text-foreground">{selectedTenant.lease_end || "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Loyer HC</span><p className="font-medium text-foreground">{selectedTenant.rent_amount ? `${selectedTenant.rent_amount} €` : "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Charges</span><p className="font-medium text-foreground">{selectedTenant.charges_amount ? `${selectedTenant.charges_amount} €` : "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Dépôt de garantie</span><p className="font-medium text-foreground">{selectedTenant.deposit_amount ? `${selectedTenant.deposit_amount} €` : "—"}</p></div>
                </div>
                {selectedTenant.notes && <div className="mt-4"><span className="text-xs text-muted-foreground">Notes</span><p className="text-sm text-foreground mt-1">{selectedTenant.notes}</p></div>}
              </div>

              {/* Payment history */}
              <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
                <h3 className="font-semibold text-foreground mb-3">Historique des paiements</h3>
                {tenantPayments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun paiement enregistré.</p>
                ) : (
                  <div className="space-y-2">
                    {tenantPayments.sort((a, b) => b.month.localeCompare(a.month)).map(p => (
                      <div key={p.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <span className={`w-2.5 h-2.5 rounded-full ${p.paid ? "bg-green-500" : "bg-red-400"}`} />
                          <span className="text-sm font-medium text-foreground">{p.month}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-foreground">{p.amount} €</span>
                          <button onClick={() => togglePayment(p.id)} className={`text-xs px-2 py-1 rounded ${p.paid ? "bg-green-500/20 text-green-700" : "bg-red-400/20 text-red-600"}`}>
                            {p.paid ? "Payé" : "Impayé"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tenantTab === "messages" && (
            <div className="bg-card rounded-xl shadow-card border border-border/50 flex flex-col" style={{ minHeight: 400 }}>
              <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-80">
                {messages.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Aucun échange.</p>}
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.from === "owner" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] rounded-xl px-4 py-2 text-sm ${msg.from === "owner" ? "bg-accent/20 text-foreground" : "bg-muted text-foreground"}`}>
                      {msg.content}
                      <div className="text-xs text-muted-foreground mt-1">{new Date(msg.created_at).toLocaleString("fr-FR")}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border/50 p-3 flex gap-2">
                <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSendMessage()} placeholder="Écrire un message..."
                  className="flex-1 bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                <button onClick={handleSendMessage} className="bg-accent/20 text-accent px-3 py-2 rounded-lg hover:bg-accent/30 transition-colors"><Send className="h-4 w-4" /></button>
              </div>
            </div>
          )}

          {tenantTab === "documents" && (
            <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
              <p className="text-sm text-muted-foreground mb-4">Documents demandés ou fournis par le locataire :</p>
              <div className="space-y-3">
                {["Attestation d'assurance habitation", "Pièce d'identité", "Justificatif de revenus", "RIB", "Caution solidaire"].map((doc) => (
                  <div key={doc} className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center gap-3"><FileText className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-foreground">{doc}</span></div>
                    <span className="text-xs text-warning font-medium">En attente</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  /* ─── Tabs bar ─── */
  const tabs: { key: Tab; label: string; icon: typeof Home }[] = [
    { key: "dashboard", label: "Vue d'ensemble", icon: Building },
    { key: "tenants", label: "Locataires", icon: Users },
    { key: "documents", label: "Modèles & Docs", icon: FileText },
    { key: "payments", label: "Loyers & Paiements", icon: Euro },
  ];

  const iconMap: Record<string, typeof Home> = {
    "lease": Home, "rent-receipt": Receipt, "inventory": ClipboardList,
    "rent-revision": TrendingUp, "charges-regularization": Euro,
    "unpaid-notice": AlertTriangle,
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Gestion locative</h1>
          <p className="text-muted-foreground text-sm mt-1">Locataires, baux, quittances, paiements — tout au même endroit.</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 bg-muted/50 rounded-lg p-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <tab.icon className="h-4 w-4" />{tab.label}
            </button>
          ))}
        </div>

        {/* ─── Dashboard Tab ─── */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
                <div className="text-xs text-muted-foreground mb-1">Biens occupés</div>
                <div className="text-2xl font-bold text-foreground">{occupiedProperties}</div>
              </div>
              <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
                <div className="text-xs text-muted-foreground mb-1">Revenus mensuels</div>
                <div className="text-2xl font-bold text-foreground">{totalRent.toLocaleString("fr-FR")} €</div>
              </div>
              <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
                <div className="text-xs text-muted-foreground mb-1">Impayés</div>
                <div className={`text-2xl font-bold ${unpaidCount > 0 ? "text-red-500" : "text-green-500"}`}>{unpaidCount}</div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
              <h3 className="font-semibold text-foreground mb-4">Actions rapides</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <button onClick={() => { setActiveTab("tenants"); setShowTenantForm(true); }} className="flex items-center gap-3 bg-muted/30 rounded-lg p-3 hover:bg-muted/50 transition-colors text-left">
                  <UserPlus className="h-5 w-5 text-accent" /><span className="text-sm font-medium text-foreground">Ajouter un locataire</span>
                </button>
                <button onClick={() => setSelectedTemplate(frRentReceipt)} className="flex items-center gap-3 bg-muted/30 rounded-lg p-3 hover:bg-muted/50 transition-colors text-left">
                  <Receipt className="h-5 w-5 text-accent" /><span className="text-sm font-medium text-foreground">Générer une quittance</span>
                </button>
                <button onClick={generateMonthlyPayments} className="flex items-center gap-3 bg-muted/30 rounded-lg p-3 hover:bg-muted/50 transition-colors text-left">
                  <Euro className="h-5 w-5 text-accent" /><span className="text-sm font-medium text-foreground">Appels de loyer du mois</span>
                </button>
              </div>
            </div>

            {/* Recent receipts */}
            {receipts.length > 0 && (
              <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
                <h3 className="font-semibold text-foreground mb-3">Dernières quittances</h3>
                <div className="space-y-2">
                  {receipts.slice(-5).reverse().map(r => {
                    const data = r.dataJson;
                    const total = (Number(data.rentAmount) || 0) + (Number(data.chargesAmount) || 0);
                    return (
                      <div key={r.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-2.5">
                        <div><span className="text-sm font-medium text-foreground">{String(data.tenantName || "—")}</span><span className="text-xs text-muted-foreground ml-2">{r.title}</span></div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-foreground">{total.toLocaleString("fr-FR")} €</span>
                          <button onClick={() => handleDownloadReceipt(r)} className="text-muted-foreground hover:text-foreground"><Download className="h-4 w-4" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Tenants Tab ─── */}
        {activeTab === "tenants" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">{tenants.length} locataire{tenants.length !== 1 ? "s" : ""}</h2>
              <button onClick={() => setShowTenantForm(true)} className="flex items-center gap-2 bg-gradient-gold text-accent-foreground text-sm font-semibold px-4 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity">
                <Plus className="h-4 w-4" />{editingTenant ? "Modifier" : "Ajouter"}
              </button>
            </div>

            {showTenantForm && (
              <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">{editingTenant ? "Modifier le locataire" : "Nouveau locataire"}</h3>
                  <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { k: "name", l: "Nom complet *", t: "text" },
                    { k: "email", l: "Email", t: "email" },
                    { k: "phone", l: "Téléphone", t: "tel" },
                    { k: "address", l: "Adresse du bien", t: "text" },
                    { k: "lease_start", l: "Début du bail", t: "date" },
                    { k: "lease_end", l: "Fin du bail", t: "date" },
                    { k: "rent_amount", l: "Loyer HC (€)", t: "number" },
                    { k: "charges_amount", l: "Charges (€)", t: "number" },
                    { k: "deposit_amount", l: "Dépôt de garantie (€)", t: "number" },
                  ].map(f => (
                    <input key={f.k} value={(form as any)[f.k] || ""} onChange={(e) => setForm({ ...form, [f.k]: f.t === "number" ? Number(e.target.value) : e.target.value })}
                      placeholder={f.l} type={f.t}
                      className="bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                  ))}
                  <select value={form.lease_type} onChange={(e) => setForm({ ...form, lease_type: e.target.value })}
                    className="bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent">
                    <option value="empty">Bail vide</option>
                    <option value="furnished">Bail meublé</option>
                    <option value="commercial">Bail commercial</option>
                  </select>
                </div>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes"
                  className="mt-4 w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" rows={2} />
                <button onClick={handleAddTenant} className="mt-4 bg-gradient-gold text-accent-foreground text-sm font-semibold px-6 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity">
                  {editingTenant ? "Enregistrer les modifications" : "Ajouter le locataire"}
                </button>
              </div>
            )}

            {tenants.length === 0 && !showTenantForm && (
              <div className="text-center py-16">
                <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-foreground mb-1">Aucun locataire</h2>
                <p className="text-sm text-muted-foreground">Ajoutez votre premier locataire pour commencer.</p>
              </div>
            )}

            <div className="space-y-3">
              {tenants.map((t) => (
                <div key={t.id} className="flex items-center gap-4 bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover transition-all group">
                  <button onClick={() => { setSelectedTenant(t); setTenantTab("info"); loadMessages(t.id); }} className="flex items-center gap-4 flex-1 text-left">
                    <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-accent-foreground">{t.name[0]?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground text-sm">{t.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                        {t.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{t.address}</span>}
                        {t.rent_amount > 0 && <span>{t.rent_amount} €/mois</span>}
                        <span className="capitalize">{t.lease_type === "furnished" ? "Meublé" : t.lease_type === "commercial" ? "Commercial" : "Vide"}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  </button>
                  <button onClick={() => handleDeleteTenant(t.id)} className="text-muted-foreground/40 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Documents Tab ─── */}
        {activeTab === "documents" && (
          <div>
            <h2 className="font-semibold text-foreground mb-4">Modèles de documents locatifs</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rentalTemplates.map((t) => {
                const Icon = Object.entries(iconMap).find(([k]) => t.docType.includes(k))?.[1] || FileText;
                return (
                  <button key={t.id} onClick={() => setSelectedTemplate(t)}
                    className="flex items-start gap-4 bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover transition-all text-left group">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-gradient-gold transition-colors shrink-0">
                      <Icon className="h-5 w-5 text-muted-foreground group-hover:text-accent-foreground transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground text-sm">{t.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
                      {t.legalBasis && <div className="text-xs text-muted-foreground/60 mt-1 italic">{t.legalBasis}</div>}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 mt-1 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Payments Tab ─── */}
        {activeTab === "payments" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Suivi des loyers</h2>
              <button onClick={generateMonthlyPayments} className="flex items-center gap-2 bg-gradient-gold text-accent-foreground text-sm font-semibold px-4 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity">
                <Plus className="h-4 w-4" />Appels du mois
              </button>
            </div>

            {payments.length === 0 ? (
              <div className="bg-card rounded-xl shadow-card border border-border/50 p-12 text-center">
                <Euro className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground text-sm">Aucun appel de loyer. Cliquez sur "Appels du mois" pour générer.</p>
              </div>
            ) : (
              <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Locataire</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Mois</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Montant</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payments.sort((a, b) => b.month.localeCompare(a.month)).map(p => {
                      const tenant = tenants.find(t => t.id === p.tenant_id);
                      return (
                        <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-foreground">{tenant?.name || "—"}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{p.month}</td>
                          <td className="px-4 py-3 text-sm font-medium text-foreground">{p.amount.toLocaleString("fr-FR")} €</td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => togglePayment(p.id)} className={`text-xs px-3 py-1 rounded-full font-medium ${p.paid ? "bg-green-500/20 text-green-700" : "bg-red-400/20 text-red-600"}`}>
                              {p.paid ? "✓ Payé" : "Impayé"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Receipts section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground">Quittances générées</h3>
                <button onClick={() => setSelectedTemplate(frRentReceipt)} className="text-xs text-accent hover:underline flex items-center gap-1"><Plus className="h-3 w-3" />Nouvelle quittance</button>
              </div>
              {receipts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune quittance générée.</p>
              ) : (
                <div className="space-y-2">
                  {receipts.map(r => {
                    const data = r.dataJson; const total = (Number(data.rentAmount) || 0) + (Number(data.chargesAmount) || 0);
                    return (
                      <div key={r.id} className="flex items-center justify-between bg-card rounded-lg px-4 py-3 border border-border/50">
                        <div><span className="text-sm font-medium text-foreground">{String(data.tenantName || "—")}</span><span className="text-xs text-muted-foreground ml-2">{r.title}</span></div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-foreground">{total.toLocaleString("fr-FR")} €</span>
                          <button onClick={() => handleDownloadReceipt(r)} className="text-muted-foreground hover:text-foreground"><Download className="h-4 w-4" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default RentalManagement;
