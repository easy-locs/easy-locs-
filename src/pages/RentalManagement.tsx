import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DocumentBuilder from "@/components/documents/DocumentBuilder";
import InventoryBuilder from "@/components/rental/InventoryBuilder";
import TenantDocuments from "@/components/rental/TenantDocuments";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getDocuments, type GeneratedDocument } from "@/lib/store";
import { getTemplatesByCategory } from "@/lib/templates/registry";
import { frRentReceipt } from "@/lib/templates/fr/rent-receipt";
import { generateFromTemplate, downloadPDF } from "@/lib/pdf-generator";
import type { DocumentTemplate } from "@/lib/templates/types";
import { supabase } from "@/integrations/supabase/client";
import {
  Home, FileText, ChevronRight, Plus, Users, Send, X,
  Phone, MapPin, Calendar, Download, Receipt, ClipboardList,
  TrendingUp, AlertTriangle, Building, Eye, Trash2, Euro,
  UserPlus, MessageSquare, Upload, Edit, Search, ArrowLeft,
  CheckCircle, Key, Thermometer, Droplets, Zap, ArrowRight,
  ClipboardCheck, Link2, CalendarClock, CreditCard, Loader2
} from "lucide-react";
import AddressAutocomplete, { type AddressResult } from "@/components/ui/AddressAutocomplete";

/* ─── Types ─── */
interface Property {
  id: string;
  label: string;
  address: string;
  postalCode: string;
  city: string;
  type: "apartment" | "house" | "studio" | "commercial" | "parking";
  surface: number;
  rooms: number;
  floor?: number;
  heating: string;
  furnished: boolean;
  monthlyRent: number;
  monthlyCharges: number;
  depositAmount: number;
  notes: string;
}

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  propertyId: string;
  lease_start: string;
  lease_end: string;
  rent_amount: number;
  charges_amount: number;
  deposit_amount: number;
  lease_type: string;
  notes: string;
  birthDate?: string;
  birthPlace?: string;
  nationality?: string;
  profession?: string;
  guarantorName?: string;
  guarantorPhone?: string;
  tenantUserId?: string;
}

interface TenantMessage { id: string; from: string; content: string; created_at: string; }
interface Payment { id: string; tenant_id: string; month: string; amount: number; paid: boolean; paid_date?: string; receipt_validated?: boolean; }

type Tab = "dashboard" | "properties" | "tenants" | "documents" | "payments" | "inventory";
type TenantDetailTab = "info" | "messages" | "documents" | "payments";

/* ─── Property types ─── */
const propertyTypes = [
  { value: "apartment", label: "Appartement" },
  { value: "house", label: "Maison" },
  { value: "studio", label: "Studio" },
  { value: "commercial", label: "Local commercial" },
  { value: "parking", label: "Parking / Garage" },
];

const heatingTypes = [
  { value: "individual-gas", label: "Individuel gaz" },
  { value: "individual-electric", label: "Individuel électrique" },
  { value: "collective", label: "Collectif" },
  { value: "heat-pump", label: "Pompe à chaleur" },
  { value: "other", label: "Autre" },
];

/* ─── Component ─── */
const RentalManagement = () => {
  const { user, orgId } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantTab, setTenantTab] = useState<TenantDetailTab>("info");

  // Inventory builder
  const [inventoryMode, setInventoryMode] = useState<{ propertyId: string; tenantId?: string; reportType: "entry" | "exit"; propertyLabel: string } | null>(null);

  // Property state
  const [properties, setProperties] = useState<Property[]>([]);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [propertyForm, setPropertyForm] = useState<Omit<Property, "id">>({
    label: "", address: "", postalCode: "", city: "", type: "apartment",
    surface: 0, rooms: 1, heating: "individual-gas", furnished: false,
    monthlyRent: 0, monthlyCharges: 0, depositAmount: 0, notes: "", floor: undefined,
  });

  // Tenant state
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [tenantForm, setTenantForm] = useState<Omit<Tenant, "id">>({
    name: "", email: "", phone: "", propertyId: "", lease_start: "", lease_end: "",
    rent_amount: 0, charges_amount: 0, deposit_amount: 0, lease_type: "empty", notes: "",
    birthDate: "", birthPlace: "", nationality: "Française", profession: "", guarantorName: "", guarantorPhone: "",
  });

  // Messages & Payments
  const [messages, setMessages] = useState<TenantMessage[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [newMessage, setNewMessage] = useState("");

  // Postal code lookup
  const [postalSuggestions, setPostalSuggestions] = useState<{ city: string; code: string }[]>([]);
  const [showPostalSuggestions, setShowPostalSuggestions] = useState(false);

  // Tenant invite link
  const [invitingTenantId, setInvitingTenantId] = useState<string | null>(null);
  // Stripe rent payment
  const [payingRentId, setPayingRentId] = useState<string | null>(null);

  // Storage keys (local fallback)
  const propKey = `adminia_properties_${orgId}`;
  const tenKey = `adminia_tenants_${orgId}`;
  const payKey = `adminia_payments_${orgId}`;
  const msgKey = (tid: string) => `adminia_tenant_msgs_${orgId}_${tid}`;

  useEffect(() => {
    if (!orgId) return;
    const p = localStorage.getItem(propKey);
    if (p) setProperties(JSON.parse(p));
    const t = localStorage.getItem(tenKey);
    if (t) setTenants(JSON.parse(t));
    const py = localStorage.getItem(payKey);
    if (py) setPayments(JSON.parse(py));
  }, [orgId, propKey, tenKey, payKey]);

  const saveProperties = useCallback((p: Property[]) => { setProperties(p); localStorage.setItem(propKey, JSON.stringify(p)); }, [propKey]);
  const saveTenants = useCallback((t: Tenant[]) => { setTenants(t); localStorage.setItem(tenKey, JSON.stringify(t)); }, [tenKey]);
  const savePayments = useCallback((p: Payment[]) => { setPayments(p); localStorage.setItem(payKey, JSON.stringify(p)); }, [payKey]);
  const loadMessages = useCallback((tid: string) => { const s = localStorage.getItem(msgKey(tid)); setMessages(s ? JSON.parse(s) : []); }, [orgId]);

  // Templates
  const rentalTemplates = getTemplatesByCategory("rental", "FR");
  const receipts = getDocuments().filter((d) => d.type === "rent-receipt");

  // Stats
  const totalRent = tenants.reduce((s, t) => s + (t.rent_amount || 0), 0);
  const totalCharges = tenants.reduce((s, t) => s + (t.charges_amount || 0), 0);
  const unpaidCount = payments.filter(p => !p.paid).length;
  const occupiedProperties = new Set(tenants.map(t => t.propertyId)).size;
  const vacantProperties = properties.length - occupiedProperties;

  /* ─── Postal code lookup ─── */
  const handlePostalCodeChange = async (value: string) => {
    setPropertyForm(prev => ({ ...prev, postalCode: value }));
    if (value.length === 5) {
      try {
        const res = await fetch(`https://geo.api.gouv.fr/communes?codePostal=${value}&fields=nom,codesPostaux&limit=10`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setPostalSuggestions(data.map((c: any) => ({ city: c.nom, code: value })));
          setShowPostalSuggestions(true);
        } else {
          setPostalSuggestions([]);
          setShowPostalSuggestions(false);
        }
      } catch {
        setPostalSuggestions([]);
      }
    } else {
      setShowPostalSuggestions(false);
    }
  };

  const selectCity = (city: string) => {
    setPropertyForm(prev => ({ ...prev, city }));
    setShowPostalSuggestions(false);
  };

  /* ─── Property handlers ─── */
  const handleSaveProperty = () => {
    if (!propertyForm.label.trim()) { toast({ title: "Erreur", description: "Le nom du bien est requis", variant: "destructive" }); return; }
    if (editingProperty) {
      saveProperties(properties.map(p => p.id === editingProperty.id ? { ...editingProperty, ...propertyForm } : p));
      toast({ title: "Bien modifié" });
    } else {
      saveProperties([...properties, { id: crypto.randomUUID(), ...propertyForm }]);
      toast({ title: "Bien ajouté" });
    }
    resetPropertyForm();
  };

  const resetPropertyForm = () => {
    setPropertyForm({ label: "", address: "", postalCode: "", city: "", type: "apartment", surface: 0, rooms: 1, heating: "individual-gas", furnished: false, monthlyRent: 0, monthlyCharges: 0, depositAmount: 0, notes: "", floor: undefined });
    setShowPropertyForm(false);
    setEditingProperty(null);
  };

  const handleDeleteProperty = (id: string) => {
    saveProperties(properties.filter(p => p.id !== id));
    toast({ title: "Bien supprimé" });
  };

  /* ─── Tenant handlers ─── */
  const handleSaveTenant = () => {
    if (!tenantForm.name.trim()) { toast({ title: "Erreur", description: "Le nom est requis", variant: "destructive" }); return; }
    if (editingTenant) {
      saveTenants(tenants.map(t => t.id === editingTenant.id ? { ...editingTenant, ...tenantForm } : t));
      toast({ title: "Locataire modifié" });
    } else {
      saveTenants([...tenants, { id: crypto.randomUUID(), ...tenantForm }]);
      toast({ title: "Locataire ajouté" });
    }
    resetTenantForm();
  };

  const resetTenantForm = () => {
    setTenantForm({ name: "", email: "", phone: "", propertyId: "", lease_start: "", lease_end: "", rent_amount: 0, charges_amount: 0, deposit_amount: 0, lease_type: "empty", notes: "", birthDate: "", birthPlace: "", nationality: "Française", profession: "", guarantorName: "", guarantorPhone: "" });
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
    setTenantForm({ name: t.name, email: t.email, phone: t.phone, propertyId: t.propertyId || "", lease_start: t.lease_start, lease_end: t.lease_end, rent_amount: t.rent_amount, charges_amount: t.charges_amount || 0, deposit_amount: t.deposit_amount || 0, lease_type: t.lease_type || "empty", notes: t.notes, birthDate: t.birthDate || "", birthPlace: t.birthPlace || "", nationality: t.nationality || "Française", profession: t.profession || "", guarantorName: t.guarantorName || "", guarantorPhone: t.guarantorPhone || "" });
    setShowTenantForm(true);
    setSelectedTenant(null);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedTenant) return;
    const msg: TenantMessage = { id: crypto.randomUUID(), from: "owner", content: newMessage, created_at: new Date().toISOString() };
    const updated = [...messages, msg];
    setMessages(updated);
    localStorage.setItem(msgKey(selectedTenant.id), JSON.stringify(updated));
    setNewMessage("");
  };

  const togglePayment = (paymentId: string) => {
    savePayments(payments.map(p => p.id === paymentId ? { ...p, paid: !p.paid, paid_date: !p.paid ? new Date().toISOString() : undefined } : p));
  };

  /* ─── Auto rent call generation (the 25th) ─── */
  const generateMonthlyPayments = () => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const existing = payments.filter(p => p.month === month);
    const newPayments: Payment[] = [];
    for (const t of tenants) {
      if (!existing.some(p => p.tenant_id === t.id) && t.rent_amount > 0) {
        newPayments.push({ id: crypto.randomUUID(), tenant_id: t.id, month, amount: t.rent_amount + (t.charges_amount || 0), paid: false, receipt_validated: false });
      }
    }
    if (newPayments.length > 0) {
      savePayments([...payments, ...newPayments]);
      toast({ title: `${newPayments.length} appel(s) de loyer généré(s)` });
    } else {
      toast({ title: "Tous les appels du mois sont déjà créés" });
    }
  };

  // Auto-generate rent calls on the 25th
  useEffect(() => {
    const now = new Date();
    if (now.getDate() >= 25 && tenants.length > 0) {
      // Check next month
      const nextMonth = now.getDate() >= 25
        ? `${now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear()}-${String(now.getMonth() === 11 ? 1 : now.getMonth() + 2).padStart(2, "0")}`
        : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const existing = payments.filter(p => p.month === nextMonth);
      if (existing.length === 0) {
        const newPayments: Payment[] = [];
        for (const t of tenants) {
          if (t.rent_amount > 0) {
            newPayments.push({ id: crypto.randomUUID(), tenant_id: t.id, month: nextMonth, amount: t.rent_amount + (t.charges_amount || 0), paid: false, receipt_validated: false });
          }
        }
        if (newPayments.length > 0) {
          savePayments([...payments, ...newPayments]);
          toast({ title: `📬 Appels de loyer ${nextMonth} générés automatiquement (le 25)` });
        }
      }
    }
  }, [tenants.length]);

  /* ─── Validate receipt for tenant access ─── */
  const validateReceipt = (paymentId: string) => {
    savePayments(payments.map(p => p.id === paymentId ? { ...p, receipt_validated: true } : p));
    toast({ title: "Quittance validée — le locataire peut désormais la télécharger" });
  };

  /* ─── Auto-generate receipt for paid rent call ─── */
  const generateReceiptForPayment = (payment: Payment) => {
    const tenant = tenants.find(t => t.id === payment.tenant_id);
    if (!tenant) return;
    const prop = properties.find(p => p.id === tenant.propertyId);
    const data: Record<string, unknown> = {
      ownerName: user?.user_metadata?.name || "Propriétaire",
      ownerAddress: prop?.address || "",
      tenantName: tenant.name,
      tenantAddress: prop ? `${prop.address}, ${prop.postalCode} ${prop.city}` : "",
      propertyAddress: prop ? `${prop.address}, ${prop.postalCode} ${prop.city}` : "",
      rentAmount: tenant.rent_amount,
      chargesAmount: tenant.charges_amount,
      periodStart: `${payment.month}-01`,
      periodEnd: `${payment.month}-${new Date(+payment.month.split("-")[0], +payment.month.split("-")[1], 0).getDate()}`,
      paymentDate: payment.paid_date || new Date().toISOString().split("T")[0],
    };
    const doc = generateFromTemplate(frRentReceipt, data);
    downloadPDF(doc, `Quittance_${tenant.name}_${payment.month}.pdf`);
    toast({ title: "Quittance PDF téléchargée" });
  };

  /* ─── Tenant invite link ─── */
  const sendTenantInvite = async (tenant: Tenant) => {
    if (!tenant.email) {
      toast({ title: "Erreur", description: "Le locataire n'a pas d'email", variant: "destructive" });
      return;
    }
    setInvitingTenantId(tenant.id);
    try {
      // Send magic link to tenant's email
      const { error } = await supabase.auth.signInWithOtp({
        email: tenant.email,
        options: { shouldCreateUser: true, data: { name: tenant.name, role: "tenant" } },
      });
      if (error) throw error;
      toast({ title: "Invitation envoyée", description: `Un lien de connexion a été envoyé à ${tenant.email}` });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setInvitingTenantId(null);
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

  const getPropertyForTenant = (t: Tenant) => properties.find(p => p.id === t.propertyId);

  /* ─── Pay rent via Stripe ─── */
  const handlePayRent = async (payment: Payment) => {
    const tenant = tenants.find(t => t.id === payment.tenant_id);
    if (!tenant || !orgId) return;
    setPayingRentId(payment.id);
    try {
      const { data, error } = await supabase.functions.invoke("create-rent-payment", {
        body: { rentCallId: payment.id, amount: payment.amount, tenantName: tenant.name, month: payment.month, orgId },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Erreur de paiement", description: err.message, variant: "destructive" });
    } finally {
      setPayingRentId(null);
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

  /* ─── Inventory Builder mode ─── */
  if (inventoryMode) {
    return (
      <DashboardLayout>
        <InventoryBuilder
          propertyId={inventoryMode.propertyId}
          tenantId={inventoryMode.tenantId}
          reportType={inventoryMode.reportType}
          propertyLabel={inventoryMode.propertyLabel}
          onBack={() => setInventoryMode(null)}
        />
      </DashboardLayout>
    );
  }

  /* ─── Tenant detail mode ─── */
  if (selectedTenant) {
    const tenantPayments = payments.filter(p => p.tenant_id === selectedTenant.id);
    const prop = getPropertyForTenant(selectedTenant);
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <button onClick={() => setSelectedTenant(null)} className="text-sm text-accent hover:underline mb-4 flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Retour
          </button>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center">
              <span className="text-lg font-bold text-accent-foreground">{selectedTenant.name[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">{selectedTenant.name}</h1>
              <p className="text-sm text-muted-foreground">{prop ? `${prop.label} — ${prop.address}, ${prop.city}` : "Aucun bien attribué"}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => sendTenantInvite(selectedTenant)}
                disabled={invitingTenantId === selectedTenant.id}
                className="text-xs text-accent hover:underline flex items-center gap-1 disabled:opacity-50">
                <Link2 className="h-3 w-3" />{invitingTenantId === selectedTenant.id ? "Envoi…" : "Inviter le locataire"}
              </button>
              <button onClick={() => handleEditTenant(selectedTenant)} className="text-xs text-accent hover:underline flex items-center gap-1"><Edit className="h-3 w-3" /> Modifier</button>
            </div>
          </div>

          <div className="flex gap-1 mb-6 bg-muted/50 rounded-lg p-1">
            {([
              { key: "info" as const, label: "Fiche", icon: FileText },
              { key: "payments" as const, label: "Paiements", icon: Euro },
              { key: "messages" as const, label: "Échanges", icon: MessageSquare },
              { key: "documents" as const, label: "Documents", icon: Upload },
            ]).map((tab) => (
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
                  <div><span className="text-xs text-muted-foreground">Date de naissance</span><p className="font-medium text-foreground">{selectedTenant.birthDate || "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Lieu de naissance</span><p className="font-medium text-foreground">{selectedTenant.birthPlace || "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Nationalité</span><p className="font-medium text-foreground">{selectedTenant.nationality || "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Profession</span><p className="font-medium text-foreground">{selectedTenant.profession || "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Type de bail</span><p className="font-medium text-foreground">{selectedTenant.lease_type === "furnished" ? "Meublé" : selectedTenant.lease_type === "commercial" ? "Commercial" : "Vide"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Début / Fin</span><p className="font-medium text-foreground">{selectedTenant.lease_start || "—"} → {selectedTenant.lease_end || "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Loyer HC / Charges</span><p className="font-medium text-foreground">{selectedTenant.rent_amount || 0} € / {selectedTenant.charges_amount || 0} €</p></div>
                  <div><span className="text-xs text-muted-foreground">Dépôt de garantie</span><p className="font-medium text-foreground">{selectedTenant.deposit_amount || 0} €</p></div>
                  {selectedTenant.guarantorName && (
                    <>
                      <div><span className="text-xs text-muted-foreground">Garant</span><p className="font-medium text-foreground">{selectedTenant.guarantorName}</p></div>
                      <div><span className="text-xs text-muted-foreground">Tél. garant</span><p className="font-medium text-foreground">{selectedTenant.guarantorPhone || "—"}</p></div>
                    </>
                  )}
                </div>
                {selectedTenant.notes && <div className="mt-4 border-t border-border/50 pt-3"><span className="text-xs text-muted-foreground">Notes</span><p className="text-sm text-foreground mt-1">{selectedTenant.notes}</p></div>}
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {prop && (
                  <>
                    <button onClick={() => setInventoryMode({ propertyId: prop.id, tenantId: selectedTenant.id, reportType: "entry", propertyLabel: prop.label })}
                      className="flex items-center gap-3 bg-card rounded-xl p-4 shadow-card border border-border/50 hover:shadow-card-hover transition-all text-left">
                      <ClipboardCheck className="h-5 w-5 text-accent" />
                      <div><div className="text-sm font-medium text-foreground">État des lieux d'entrée</div><div className="text-xs text-muted-foreground">Pièce par pièce avec photos</div></div>
                    </button>
                    <button onClick={() => setInventoryMode({ propertyId: prop.id, tenantId: selectedTenant.id, reportType: "exit", propertyLabel: prop.label })}
                      className="flex items-center gap-3 bg-card rounded-xl p-4 shadow-card border border-border/50 hover:shadow-card-hover transition-all text-left">
                      <ClipboardCheck className="h-5 w-5 text-destructive" />
                      <div><div className="text-sm font-medium text-foreground">État des lieux de sortie</div><div className="text-xs text-muted-foreground">Comparer avec l'entrée</div></div>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {tenantTab === "payments" && (
            <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Historique des paiements</h3>
              </div>
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
                        {p.paid && !p.receipt_validated && (
                          <button onClick={() => validateReceipt(p.id)} className="text-xs text-accent hover:underline">Valider quittance</button>
                        )}
                        {p.paid && p.receipt_validated && (
                          <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Accessible locataire</span>
                        )}
                        {p.paid && (
                          <button onClick={() => generateReceiptForPayment(p)} className="text-muted-foreground hover:text-foreground"><Download className="h-3.5 w-3.5" /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
            <TenantDocuments tenantId={selectedTenant.id} tenantName={selectedTenant.name} />
          )}
        </div>
      </DashboardLayout>
    );
  }

  /* ─── Tabs bar ─── */
  const tabs: { key: Tab; label: string; icon: typeof Home }[] = [
    { key: "dashboard", label: "Vue d'ensemble", icon: Building },
    { key: "properties", label: "Biens", icon: Home },
    { key: "tenants", label: "Locataires", icon: Users },
    { key: "inventory", label: "États des lieux", icon: ClipboardCheck },
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
          <p className="text-muted-foreground text-sm mt-1">Biens, locataires, baux, quittances, paiements — tout au même endroit.</p>
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Biens", value: properties.length, icon: Home },
                { label: "Occupés", value: occupiedProperties, icon: Key },
                { label: "Revenus/mois", value: `${(totalRent + totalCharges).toLocaleString("fr-FR")} €`, icon: Euro },
                { label: "Impayés", value: unpaidCount, icon: AlertTriangle, danger: unpaidCount > 0 },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-card rounded-xl p-5 shadow-card border border-border/50">
                  <div className="flex items-center gap-2 mb-1">
                    <kpi.icon className={`h-4 w-4 ${kpi.danger ? "text-destructive" : "text-muted-foreground"}`} />
                    <span className="text-xs text-muted-foreground">{kpi.label}</span>
                  </div>
                  <div className={`text-2xl font-bold ${kpi.danger ? "text-destructive" : "text-foreground"}`}>{kpi.value}</div>
                </div>
              ))}
            </div>

            {vacantProperties > 0 && (
              <div className="flex items-start gap-3 bg-warning/10 border border-warning/30 rounded-lg p-4">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{vacantProperties} bien{vacantProperties > 1 ? "s" : ""} vacant{vacantProperties > 1 ? "s" : ""} — ajoutez un locataire pour commencer à percevoir des loyers.</p>
              </div>
            )}

            {/* Auto rent call info */}
            <div className="flex items-start gap-3 bg-accent/5 border border-accent/20 rounded-lg p-4">
              <CalendarClock className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Appels de loyer automatiques</p>
                <p className="text-xs text-muted-foreground mt-0.5">Les appels de loyer sont générés automatiquement le 25 de chaque mois pour tous les locataires actifs.</p>
              </div>
            </div>

            <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
              <h3 className="font-semibold text-foreground mb-4">Actions rapides</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <button onClick={() => { setActiveTab("properties"); setShowPropertyForm(true); }} className="flex items-center gap-3 bg-muted/30 rounded-lg p-3 hover:bg-muted/50 transition-colors text-left">
                  <Plus className="h-5 w-5 text-accent" /><span className="text-sm font-medium text-foreground">Ajouter un bien</span>
                </button>
                <button onClick={() => { setActiveTab("tenants"); setShowTenantForm(true); }} className="flex items-center gap-3 bg-muted/30 rounded-lg p-3 hover:bg-muted/50 transition-colors text-left">
                  <UserPlus className="h-5 w-5 text-accent" /><span className="text-sm font-medium text-foreground">Ajouter un locataire</span>
                </button>
                <button onClick={() => setSelectedTemplate(frRentReceipt)} className="flex items-center gap-3 bg-muted/30 rounded-lg p-3 hover:bg-muted/50 transition-colors text-left">
                  <Receipt className="h-5 w-5 text-accent" /><span className="text-sm font-medium text-foreground">Générer une quittance</span>
                </button>
                <button onClick={generateMonthlyPayments} className="flex items-center gap-3 bg-muted/30 rounded-lg p-3 hover:bg-muted/50 transition-colors text-left">
                  <Euro className="h-5 w-5 text-accent" /><span className="text-sm font-medium text-foreground">Appels de loyer du mois</span>
                </button>
                {properties.length > 0 && (
                  <button onClick={() => setActiveTab("inventory")} className="flex items-center gap-3 bg-muted/30 rounded-lg p-3 hover:bg-muted/50 transition-colors text-left">
                    <ClipboardCheck className="h-5 w-5 text-accent" /><span className="text-sm font-medium text-foreground">État des lieux</span>
                  </button>
                )}
              </div>
            </div>

            {receipts.length > 0 && (
              <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
                <h3 className="font-semibold text-foreground mb-3">Dernières quittances</h3>
                <div className="space-y-2">
                  {receipts.slice(-5).reverse().map(r => {
                    const data = r.dataJson; const total = (Number(data.rentAmount) || 0) + (Number(data.chargesAmount) || 0);
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

        {/* ─── Properties Tab ─── */}
        {activeTab === "properties" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">{properties.length} bien{properties.length !== 1 ? "s" : ""}</h2>
              <button onClick={() => setShowPropertyForm(true)} className="flex items-center gap-2 bg-gradient-gold text-accent-foreground text-sm font-semibold px-4 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity">
                <Plus className="h-4 w-4" />Ajouter un bien
              </button>
            </div>

            {showPropertyForm && (
              <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">{editingProperty ? "Modifier le bien" : "Nouveau bien"}</h3>
                  <button onClick={resetPropertyForm} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Nom du bien *</label>
                      <input value={propertyForm.label} onChange={(e) => setPropertyForm({ ...propertyForm, label: e.target.value })} placeholder="Ex: Appartement rue de Paris"
                        className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Type de bien</label>
                      <select value={propertyForm.type} onChange={(e) => setPropertyForm({ ...propertyForm, type: e.target.value as Property["type"] })}
                        className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent">
                        {propertyTypes.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <AddressAutocomplete
                      label="Adresse"
                      value={propertyForm.address}
                      onChange={(val) => setPropertyForm({ ...propertyForm, address: val })}
                      onSelect={(result: AddressResult) => {
                        setPropertyForm(prev => ({
                          ...prev,
                          address: result.label,
                          postalCode: result.postcode || prev.postalCode,
                          city: result.city || prev.city,
                        }));
                        setShowPostalSuggestions(false);
                      }}
                      placeholder="12 rue de la Paix, 75002 Paris"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative">
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Code postal</label>
                      <input value={propertyForm.postalCode} onChange={(e) => handlePostalCodeChange(e.target.value)} placeholder="75001" maxLength={5}
                        className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                      {showPostalSuggestions && postalSuggestions.length > 0 && (
                        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                          {postalSuggestions.map((s) => (
                            <button key={s.city} onClick={() => selectCity(s.city)} className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted/50 transition-colors">
                              {s.city}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Ville</label>
                      <input value={propertyForm.city} onChange={(e) => setPropertyForm({ ...propertyForm, city: e.target.value })} placeholder="Paris"
                        className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Surface (m²)</label>
                      <input type="number" value={propertyForm.surface || ""} onChange={(e) => setPropertyForm({ ...propertyForm, surface: +e.target.value })}
                        className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Pièces</label>
                      <input type="number" value={propertyForm.rooms || ""} onChange={(e) => setPropertyForm({ ...propertyForm, rooms: +e.target.value })}
                        className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Étage</label>
                      <input type="number" value={propertyForm.floor ?? ""} onChange={(e) => setPropertyForm({ ...propertyForm, floor: e.target.value ? +e.target.value : undefined })}
                        className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Chauffage</label>
                      <select value={propertyForm.heating} onChange={(e) => setPropertyForm({ ...propertyForm, heating: e.target.value })}
                        className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent">
                        {heatingTypes.map(ht => <option key={ht.value} value={ht.value}>{ht.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={propertyForm.furnished} onChange={(e) => setPropertyForm({ ...propertyForm, furnished: e.target.checked })}
                      className="h-4 w-4 rounded border-border text-accent focus:ring-accent" />
                    <label className="text-sm text-foreground">Meublé</label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Loyer HC (€/mois)</label>
                      <input type="number" value={propertyForm.monthlyRent || ""} onChange={(e) => setPropertyForm({ ...propertyForm, monthlyRent: +e.target.value })}
                        className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Charges (€/mois)</label>
                      <input type="number" value={propertyForm.monthlyCharges || ""} onChange={(e) => setPropertyForm({ ...propertyForm, monthlyCharges: +e.target.value })}
                        className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Dépôt de garantie (€)</label>
                      <input type="number" value={propertyForm.depositAmount || ""} onChange={(e) => setPropertyForm({ ...propertyForm, depositAmount: +e.target.value })}
                        className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
                    <textarea value={propertyForm.notes} onChange={(e) => setPropertyForm({ ...propertyForm, notes: e.target.value })} rows={2}
                      className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                  </div>

                  <button onClick={handleSaveProperty} className="bg-gradient-gold text-accent-foreground text-sm font-semibold px-6 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity">
                    {editingProperty ? "Enregistrer les modifications" : "Ajouter le bien"}
                  </button>
                </div>
              </div>
            )}

            {properties.length === 0 && !showPropertyForm && (
              <div className="text-center py-16">
                <Home className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-foreground mb-1">Aucun bien</h2>
                <p className="text-sm text-muted-foreground">Ajoutez votre premier bien immobilier pour commencer.</p>
              </div>
            )}

            <div className="space-y-3">
              {properties.map((p) => {
                const propTenants = tenants.filter(t => t.propertyId === p.id);
                return (
                  <div key={p.id} className="bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover transition-all group">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Home className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-sm">{p.label}</span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${propTenants.length > 0 ? "bg-green-500/20 text-green-700" : "bg-muted text-muted-foreground"}`}>
                            {propTenants.length > 0 ? "Occupé" : "Vacant"}
                          </span>
                          {p.furnished && <span className="text-[10px] font-medium bg-accent/10 text-accent px-2 py-0.5 rounded-full">Meublé</span>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{p.address}{p.city ? `, ${p.postalCode} ${p.city}` : ""}</span>
                          {p.surface > 0 && <span>{p.surface} m²</span>}
                          {p.rooms > 0 && <span>{p.rooms} pièce{p.rooms > 1 ? "s" : ""}</span>}
                          <span>{p.monthlyRent} €/mois</span>
                        </div>
                        {propTenants.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {propTenants.map(t => (
                              <button key={t.id} onClick={() => { setSelectedTenant(t); setTenantTab("info"); loadMessages(t.id); }}
                                className="text-xs bg-muted rounded px-2 py-0.5 text-foreground hover:bg-muted/80 transition-colors">
                                {t.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setInventoryMode({ propertyId: p.id, reportType: "entry", propertyLabel: p.label })}
                          className="text-muted-foreground hover:text-foreground" title="État des lieux"><ClipboardCheck className="h-4 w-4" /></button>
                        <button onClick={() => { setEditingProperty(p); setPropertyForm({ ...p }); setShowPropertyForm(true); }} className="text-muted-foreground hover:text-foreground"><Edit className="h-4 w-4" /></button>
                        <button onClick={() => handleDeleteProperty(p.id)} className="text-muted-foreground/40 hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
                  <button onClick={resetTenantForm} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Identité</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Nom complet *</label>
                      <input value={tenantForm.name} onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })}
                        className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
                      <input type="email" value={tenantForm.email} onChange={(e) => setTenantForm({ ...tenantForm, email: e.target.value })}
                        className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Téléphone</label>
                      <input type="tel" value={tenantForm.phone} onChange={(e) => setTenantForm({ ...tenantForm, phone: e.target.value })}
                        className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Date de naissance</label>
                      <input type="date" value={tenantForm.birthDate} onChange={(e) => setTenantForm({ ...tenantForm, birthDate: e.target.value })}
                        className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Lieu de naissance</label>
                      <input value={tenantForm.birthPlace} onChange={(e) => setTenantForm({ ...tenantForm, birthPlace: e.target.value })}
                        className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Nationalité</label>
                      <input value={tenantForm.nationality} onChange={(e) => setTenantForm({ ...tenantForm, nationality: e.target.value })}
                        className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Profession</label>
                      <input value={tenantForm.profession} onChange={(e) => setTenantForm({ ...tenantForm, profession: e.target.value })}
                        className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                  </div>

                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Bail</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Bien attribué</label>
                      <select value={tenantForm.propertyId} onChange={(e) => {
                        const prop = properties.find(p => p.id === e.target.value);
                        setTenantForm({
                          ...tenantForm,
                          propertyId: e.target.value,
                          rent_amount: prop?.monthlyRent || tenantForm.rent_amount,
                          charges_amount: prop?.monthlyCharges || tenantForm.charges_amount,
                          deposit_amount: prop?.depositAmount || tenantForm.deposit_amount,
                          lease_type: prop?.furnished ? "furnished" : tenantForm.lease_type,
                        });
                      }}
                        className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent">
                        <option value="">— Sélectionner un bien —</option>
                        {properties.map(p => <option key={p.id} value={p.id}>{p.label} — {p.address}</option>)}
                      </select>
                    </div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Type de bail</label>
                      <select value={tenantForm.lease_type} onChange={(e) => setTenantForm({ ...tenantForm, lease_type: e.target.value })}
                        className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent">
                        <option value="empty">Bail vide</option>
                        <option value="furnished">Bail meublé</option>
                        <option value="commercial">Bail commercial</option>
                      </select>
                    </div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Début du bail</label>
                      <input type="date" value={tenantForm.lease_start} onChange={(e) => setTenantForm({ ...tenantForm, lease_start: e.target.value })}
                        className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Fin du bail</label>
                      <input type="date" value={tenantForm.lease_end} onChange={(e) => setTenantForm({ ...tenantForm, lease_end: e.target.value })}
                        className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                  </div>

                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Finances</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Loyer HC (€)</label>
                      <input type="number" value={tenantForm.rent_amount || ""} onChange={(e) => setTenantForm({ ...tenantForm, rent_amount: +e.target.value })}
                        className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Charges (€)</label>
                      <input type="number" value={tenantForm.charges_amount || ""} onChange={(e) => setTenantForm({ ...tenantForm, charges_amount: +e.target.value })}
                        className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Dépôt de garantie (€)</label>
                      <input type="number" value={tenantForm.deposit_amount || ""} onChange={(e) => setTenantForm({ ...tenantForm, deposit_amount: +e.target.value })}
                        className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                  </div>

                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Garant</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Nom du garant</label>
                      <input value={tenantForm.guarantorName} onChange={(e) => setTenantForm({ ...tenantForm, guarantorName: e.target.value })}
                        className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Tél. du garant</label>
                      <input type="tel" value={tenantForm.guarantorPhone} onChange={(e) => setTenantForm({ ...tenantForm, guarantorPhone: e.target.value })}
                        className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                  </div>

                  <textarea value={tenantForm.notes} onChange={(e) => setTenantForm({ ...tenantForm, notes: e.target.value })} placeholder="Notes" rows={2}
                    className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                  <button onClick={handleSaveTenant} className="bg-gradient-gold text-accent-foreground text-sm font-semibold px-6 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity">
                    {editingTenant ? "Enregistrer les modifications" : "Ajouter le locataire"}
                  </button>
                </div>
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
              {tenants.map((t) => {
                const prop = getPropertyForTenant(t);
                return (
                  <div key={t.id} className="flex items-center gap-4 bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover transition-all group">
                    <button onClick={() => { setSelectedTenant(t); setTenantTab("info"); loadMessages(t.id); }} className="flex items-center gap-4 flex-1 text-left">
                      <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-accent-foreground">{t.name[0]?.toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground text-sm">{t.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                          {prop && <span className="flex items-center gap-1"><Home className="h-3 w-3" />{prop.label}</span>}
                          {t.rent_amount > 0 && <span>{t.rent_amount} €/mois</span>}
                          <span className="capitalize">{t.lease_type === "furnished" ? "Meublé" : t.lease_type === "commercial" ? "Commercial" : "Vide"}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    </button>
                    <button onClick={() => handleDeleteTenant(t.id)} className="text-muted-foreground/40 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Inventory Tab ─── */}
        {activeTab === "inventory" && (
          <div>
            <h2 className="font-semibold text-foreground mb-4">États des lieux</h2>
            {properties.length === 0 ? (
              <div className="text-center py-16">
                <ClipboardCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Ajoutez d'abord un bien pour créer un état des lieux.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {properties.map(p => {
                  const propTenants = tenants.filter(t => t.propertyId === p.id);
                  return (
                    <div key={p.id} className="bg-card rounded-xl p-5 shadow-card border border-border/50">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="font-semibold text-foreground text-sm">{p.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">{p.address}, {p.city}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => setInventoryMode({ propertyId: p.id, tenantId: propTenants[0]?.id, reportType: "entry", propertyLabel: p.label })}
                          className="flex items-center gap-2 text-sm bg-accent/10 text-accent px-3 py-2 rounded-lg hover:bg-accent/20 transition-colors">
                          <ClipboardCheck className="h-4 w-4" />État des lieux d'entrée
                        </button>
                        <button onClick={() => setInventoryMode({ propertyId: p.id, tenantId: propTenants[0]?.id, reportType: "exit", propertyLabel: p.label })}
                          className="flex items-center gap-2 text-sm bg-destructive/10 text-destructive px-3 py-2 rounded-lg hover:bg-destructive/20 transition-colors">
                          <ClipboardCheck className="h-4 w-4" />État des lieux de sortie
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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

            {/* Auto-schedule info */}
            <div className="flex items-start gap-3 bg-accent/5 border border-accent/20 rounded-lg p-3">
              <CalendarClock className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">Les appels de loyer sont générés automatiquement le <strong className="text-foreground">25 de chaque mois</strong> pour le mois suivant.</p>
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
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Bien</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Mois</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Montant</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Statut</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Quittance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payments.sort((a, b) => b.month.localeCompare(a.month)).map(p => {
                      const tenant = tenants.find(t => t.id === p.tenant_id);
                      const prop = tenant ? getPropertyForTenant(tenant) : undefined;
                      return (
                        <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-foreground">{tenant?.name || "—"}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{prop?.label || "—"}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{p.month}</td>
                          <td className="px-4 py-3 text-sm font-medium text-foreground">{p.amount.toLocaleString("fr-FR")} €</td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => togglePayment(p.id)} className={`text-xs px-3 py-1 rounded-full font-medium ${p.paid ? "bg-green-500/20 text-green-700" : "bg-red-400/20 text-red-600"}`}>
                              {p.paid ? "✓ Payé" : "Impayé"}
                            </button>
                            {!p.paid && (
                              <button
                                onClick={() => handlePayRent(p)}
                                disabled={payingRentId === p.id}
                                className="ml-2 inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium bg-accent/20 text-accent hover:bg-accent/30 transition-colors disabled:opacity-50"
                              >
                                {payingRentId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CreditCard className="h-3 w-3" />}
                                Payer par CB
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {p.paid && !p.receipt_validated && (
                              <button onClick={() => validateReceipt(p.id)} className="text-xs text-accent hover:underline">Valider</button>
                            )}
                            {p.paid && p.receipt_validated && (
                              <span className="text-xs text-green-600 flex items-center gap-1 justify-end"><CheckCircle className="h-3 w-3" />Validée</span>
                            )}
                            {p.paid && (
                              <button onClick={() => generateReceiptForPayment(p)} className="text-muted-foreground hover:text-foreground ml-2"><Download className="h-3.5 w-3.5" /></button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

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
