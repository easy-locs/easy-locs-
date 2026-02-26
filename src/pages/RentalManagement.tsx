import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DocumentBuilder from "@/components/documents/DocumentBuilder";
import InventoryBuilder from "@/components/rental/InventoryBuilder";
import TenantDocuments from "@/components/rental/TenantDocuments";
import InventoryTab from "@/components/rental/InventoryTab";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRentalData, type Property, type Tenant, type RentCall } from "@/hooks/useRentalData";
import { getDocuments, type GeneratedDocument } from "@/lib/store";
import { getTemplatesByCategory, getTemplateById } from "@/lib/templates/registry";
import { frRentReceipt } from "@/lib/templates/fr/rent-receipt";
import { frLeaseEmpty } from "@/lib/templates/fr/lease-empty";
import { frLeaseFurnished } from "@/lib/templates/fr/lease-furnished";
import { frLeaseCommercial } from "@/lib/templates/fr/lease-commercial";
import { generateFromTemplate, downloadPDF, pdfToDataUri } from "@/lib/pdf-generator";
import type { DocumentTemplate } from "@/lib/templates/types";
import { supabase } from "@/integrations/supabase/client";
import {
  Home, FileText, ChevronRight, Plus, Users, Send, X,
  Phone, MapPin, Calendar, Download, Receipt, ClipboardList,
  TrendingUp, AlertTriangle, Building, Eye, Trash2, Euro,
  UserPlus, MessageSquare, Upload, Edit, Search, ArrowLeft,
  CheckCircle, Key, Thermometer, Droplets, Zap, ArrowRight,
  ClipboardCheck, Link2, CalendarClock, CreditCard, Loader2,
  Sofa, Wallet, Filter
} from "lucide-react";
import AddressAutocomplete, { type AddressResult } from "@/components/ui/AddressAutocomplete";

type Tab = "dashboard" | "properties" | "tenants" | "documents" | "payments" | "inventory";
type TenantDetailTab = "info" | "messages" | "documents" | "payments";
type LeaseFilter = "all" | "active" | "terminated";

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

const defaultPropertyForm = {
  label: "", address: "", postal_code: "", city: "", property_type: "apartment" as string,
  surface: 0, rooms: 1, heating: "individual-gas", furnished: false,
  monthly_rent: 0, monthly_charges: 0, deposit_amount: 0, notes: "", floor: undefined as number | undefined,
  building_name: "" as string, lot_number: "" as string,
};

const defaultTenantForm = {
  name: "", email: "", phone: "", property_id: null as string | null,
  lease_start: null as string | null, lease_end: null as string | null,
  rent_amount: 0, charges_amount: 0, deposit_amount: 0, lease_type: "empty",
  notes: "", birth_date: null as string | null, birth_place: null as string | null,
  nationality: "Française" as string | null, profession: null as string | null,
  guarantor_name: null as string | null, guarantor_phone: null as string | null,
};

const CONDITIONS_LABEL: Record<string, string> = { new: "Neuf", good: "Bon état", fair: "État moyen", poor: "Usé" };
const EXPENSE_CATEGORIES: Record<string, string> = {
  travaux: "Travaux", assurance: "Assurance", taxe_fonciere: "Taxe foncière",
  charges_copro: "Charges copro", interet_emprunt: "Intérêts emprunt",
  frais_gestion: "Frais gestion", diagnostics: "Diagnostics", honoraires: "Honoraires", other: "Autre",
};

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

const RentalManagement = () => {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const {
    properties, tenants, rentCalls, loading,
    saveProperty, deleteProperty,
    saveTenant, deleteTenant, sendTenantInvite,
    generateMonthlyRentCalls, togglePayment, validateReceipt,
  } = useRentalData();

  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [tenantTab, setTenantTab] = useState<TenantDetailTab>("info");

  // Filters
  const [leaseFilter, setLeaseFilter] = useState<LeaseFilter>("active");
  const [paymentPropertyFilter, setPaymentPropertyFilter] = useState("");

  // Inventory builder
  const [inventoryMode, setInventoryMode] = useState<{ propertyId: string; tenantId?: string; reportType: "entry" | "exit"; propertyLabel: string } | null>(null);

  // Property form
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [propertyForm, setPropertyForm] = useState(defaultPropertyForm);

  // Tenant form
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [tenantForm, setTenantForm] = useState(defaultTenantForm);

  // Messages
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");

  // Stripe rent payment
  const [payingRentId, setPayingRentId] = useState<string | null>(null);
  const [invitingTenantId, setInvitingTenantId] = useState<string | null>(null);

  // Postal code lookup
  const [postalSuggestions, setPostalSuggestions] = useState<{ city: string; code: string }[]>([]);
  const [showPostalSuggestions, setShowPostalSuggestions] = useState(false);

  // Property detail linked data
  const [propertyExpenses, setPropertyExpenses] = useState<any[]>([]);
  const [propertyFurniture, setPropertyFurniture] = useState<any[]>([]);
  const [propertyInventories, setPropertyInventories] = useState<any[]>([]);

  // Templates
  const rentalTemplates = getTemplatesByCategory("rental", "FR");

  // Stats
  const totalRent = tenants.reduce((s, t) => s + (t.rent_amount || 0), 0);
  const totalCharges = tenants.reduce((s, t) => s + (t.charges_amount || 0), 0);
  const unpaidCount = rentCalls.filter(p => !p.paid).length;
  const occupiedProperties = new Set(tenants.filter(t => t.property_id).map(t => t.property_id)).size;
  const vacantProperties = properties.length - occupiedProperties;

  // Lease filter logic
  const today = new Date().toISOString().split("T")[0];
  const isLeaseActive = (t: Tenant) => !t.lease_end || t.lease_end >= today;
  const filteredTenants = tenants.filter(t => {
    if (leaseFilter === "active") return isLeaseActive(t);
    if (leaseFilter === "terminated") return !isLeaseActive(t);
    return true;
  });
  const activeCount = tenants.filter(isLeaseActive).length;
  const terminatedCount = tenants.filter(t => !isLeaseActive(t)).length;

  // Payment filter
  const filteredPayments = paymentPropertyFilter
    ? rentCalls.filter(r => r.property_id === paymentPropertyFilter)
    : rentCalls;

  /* ─── Load property detail data ─── */
  const loadPropertyDetail = useCallback(async (propertyId: string) => {
    if (!orgId) return;
    const [{ data: expenses }, { data: furniture }, { data: inventories }] = await Promise.all([
      supabase.from("expenses").select("*").eq("org_id", orgId).eq("property_id", propertyId).order("expense_date", { ascending: false }),
      supabase.from("furniture_items").select("*").eq("org_id", orgId).eq("property_id", propertyId),
      supabase.from("inventory_reports").select("*").eq("org_id", orgId).eq("property_id", propertyId).order("report_date", { ascending: false }),
    ]);
    setPropertyExpenses(expenses || []);
    setPropertyFurniture(furniture || []);
    setPropertyInventories(inventories || []);
  }, [orgId]);

  /* ─── Postal code lookup ─── */
  const handlePostalCodeChange = async (value: string) => {
    setPropertyForm(prev => ({ ...prev, postal_code: value }));
    if (value.length === 5) {
      try {
        const res = await fetch(`https://geo.api.gouv.fr/communes?codePostal=${value}&fields=nom,codesPostaux&limit=10`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setPostalSuggestions(data.map((c: any) => ({ city: c.nom, code: value })));
          setShowPostalSuggestions(true);
        }
      } catch { /* ignore */ }
    } else {
      setShowPostalSuggestions(false);
    }
  };

  /* ─── Property handlers ─── */
  const handleSaveProperty = async () => {
    if (!propertyForm.label.trim()) { toast({ title: "Erreur", description: "Le nom du bien est requis", variant: "destructive" }); return; }
    const ok = await saveProperty(propertyForm as any, editingPropertyId || undefined);
    if (ok) resetPropertyForm();
  };

  const resetPropertyForm = () => {
    setPropertyForm(defaultPropertyForm);
    setShowPropertyForm(false);
    setEditingPropertyId(null);
  };

  const startEditProperty = (p: Property) => {
    setEditingPropertyId(p.id);
    setPropertyForm({
      label: p.label, address: p.address, postal_code: p.postal_code, city: p.city,
      property_type: p.property_type, surface: p.surface, rooms: p.rooms, floor: p.floor ?? undefined,
      heating: p.heating, furnished: p.furnished, monthly_rent: p.monthly_rent,
      monthly_charges: p.monthly_charges, deposit_amount: p.deposit_amount, notes: p.notes,
      building_name: p.building_name || "", lot_number: p.lot_number || "",
    });
    setShowPropertyForm(true);
  };

  const openPropertyDetail = (p: Property) => {
    setSelectedProperty(p);
    loadPropertyDetail(p.id);
  };

  /* ─── Tenant handlers ─── */
  const handleSaveTenant = async () => {
    if (!tenantForm.name.trim()) { toast({ title: "Erreur", description: "Le nom est requis", variant: "destructive" }); return; }
    const result = await saveTenant(tenantForm as any, editingTenantId || undefined);
    if (result) {
      if (!editingTenantId && tenantForm.email) {
        const newTenant = { ...tenantForm, id: result as string } as Tenant;
        await sendTenantInvite(newTenant);
      }
      if (!editingTenantId && tenantForm.lease_type && tenantForm.property_id) {
        await autoGenerateLease(result as string, tenantForm);
      }
      resetTenantForm();
    }
  };

  /* ─── Auto-generate lease PDF ─── */
  const autoGenerateLease = async (tenantId: string, form: typeof defaultTenantForm) => {
    const leaseTemplateMap: Record<string, DocumentTemplate> = {
      empty: frLeaseEmpty, furnished: frLeaseFurnished, commercial: frLeaseCommercial,
    };
    const template = leaseTemplateMap[form.lease_type];
    if (!template) return;
    const prop = properties.find(p => p.id === form.property_id);
    if (!prop) return;

    let landlordName = user?.user_metadata?.name || "Propriétaire";
    let landlordEmail = user?.email || "";
    try {
      const { data: profile } = await supabase.from("profiles").select("name, email").eq("id", user!.id).single();
      if (profile?.name) landlordName = profile.name;
      if (profile?.email) landlordEmail = profile.email;
    } catch { /* use defaults */ }

    const propertyTypeMap: Record<string, string> = { apartment: "Appartement", house: "Maison", studio: "Studio", commercial: "Local commercial", parking: "Parking / Garage" };
    const heatingMap: Record<string, string> = { "individual-gas": "individuel-gaz", "individual-electric": "individuel-electrique", "collective": "collectif", "heat-pump": "pompe-chaleur", "other": "autre" };

    const leaseData: Record<string, unknown> = {
      landlordName, landlordAddress: prop.address ? `${prop.address}, ${prop.postal_code} ${prop.city}` : "", landlordEmail,
      tenantName: form.name, tenantBirthDate: form.birth_date || "", tenantBirthPlace: form.birth_place || "", tenantEmail: form.email || "", tenantPhone: form.phone || "",
      propertyAddress: `${prop.address}, ${prop.postal_code} ${prop.city}`, propertyType: propertyTypeMap[prop.property_type] || prop.property_type,
      surface: prop.surface, rooms: prop.rooms, floor: prop.floor ?? "", heating: heatingMap[prop.heating] || prop.heating,
      hotWater: "individuel", annexes: "", equipments: "",
      rentAmount: form.rent_amount || prop.monthly_rent, chargesAmount: form.charges_amount || prop.monthly_charges,
      chargesMode: "provisions", depositAmount: form.deposit_amount || prop.deposit_amount, paymentDay: 5, paymentMethod: "virement",
      zoneTendue: "non", dpeLetter: "D", gesLetter: "D",
      startDate: form.lease_start || new Date().toISOString().split("T")[0],
      duration: form.lease_type === "furnished" ? "1" : form.lease_type === "commercial" ? "9" : "3",
    };
    if (form.lease_type === "commercial") {
      Object.assign(leaseData, { tenantSiret: "", tenantRCS: "", tenantRepresentant: form.name, activity: "Toutes activités commerciales", allActivities: "oui", localDescription: "", parkingSpaces: 0, taxeFonciere: 0, indexationType: "ILC", paymentFrequency: "mensuel", tva: "non", droitBail: 0, rentAmount: (form.rent_amount || prop.monthly_rent) * 12, chargesAmount: (form.charges_amount || prop.monthly_charges) * 12 });
    }
    if (form.lease_type === "furnished") {
      leaseData.furnitureList = "Literie avec couette/couverture\nVolets ou rideaux occultants\nPlaques de cuisson\nFour ou micro-ondes\nRéfrigérateur\nVaisselle et ustensiles\nTable et chaises\nÉtagères de rangement\nLuminaires\nMatériel d'entretien ménager";
    }

    try {
      const doc = generateFromTemplate(template, leaseData);
      const leaseLabel = form.lease_type === "furnished" ? "Bail meublé" : form.lease_type === "commercial" ? "Bail commercial" : "Bail d'habitation vide";
      const title = `${leaseLabel} — ${form.name}`;
      if (orgId) {
        await supabase.from("documents").insert({ org_id: orgId, user_id: user!.id, title, doc_type: template.docType, template_id: template.id, template_version: template.version, data_json: leaseData as any, status: "draft", country: "FR" } as any);
      }
      downloadPDF(doc, `${title.replace(/\s/g, "_")}.pdf`);
      toast({ title: "Bail généré automatiquement", description: `${leaseLabel} téléchargé pour ${form.name}` });
    } catch (err) {
      console.error("Auto-lease generation failed:", err);
      toast({ title: "Info", description: "Le locataire a été créé, mais la génération du bail a échoué.", variant: "destructive" });
    }
  };

  const resetTenantForm = () => { setTenantForm(defaultTenantForm); setShowTenantForm(false); setEditingTenantId(null); };

  const startEditTenant = (t: Tenant) => {
    setEditingTenantId(t.id);
    setTenantForm({
      name: t.name, email: t.email, phone: t.phone, property_id: t.property_id,
      lease_start: t.lease_start, lease_end: t.lease_end, rent_amount: t.rent_amount,
      charges_amount: t.charges_amount, deposit_amount: t.deposit_amount, lease_type: t.lease_type,
      notes: t.notes, birth_date: t.birth_date ?? null, birth_place: t.birth_place ?? null,
      nationality: t.nationality ?? "Française", profession: t.profession ?? null,
      guarantor_name: t.guarantor_name ?? null, guarantor_phone: t.guarantor_phone ?? null,
    });
    setShowTenantForm(true);
    setSelectedTenant(null);
  };

  /* ─── Messages ─── */
  const loadMessages = async (tenantId: string) => {
    if (!orgId) return;
    const { data } = await supabase.from("messages").select("*").eq("org_id", orgId).eq("tenant_id", tenantId).order("created_at", { ascending: true });
    setMessages(data || []);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTenant || !orgId || !user) return;
    await supabase.from("messages").insert({ org_id: orgId, sender_id: user.id, tenant_id: selectedTenant.id, content: newMessage.trim(), read: false });
    setNewMessage("");
    await loadMessages(selectedTenant.id);
  };

  /* ─── Receipt generation ─── */
  const generateReceiptForPayment = (payment: RentCall) => {
    const tenant = tenants.find(t => t.id === payment.tenant_id);
    if (!tenant) return;
    const prop = properties.find(p => p.id === tenant.property_id);
    const data: Record<string, unknown> = {
      ownerName: user?.user_metadata?.name || "Propriétaire", ownerAddress: prop?.address || "",
      tenantName: tenant.name, tenantAddress: prop ? `${prop.address}, ${prop.postal_code} ${prop.city}` : "",
      propertyAddress: prop ? `${prop.address}, ${prop.postal_code} ${prop.city}` : "",
      rentAmount: payment.rent_amount, chargesAmount: payment.charges_amount,
      periodStart: `${payment.month}-01`, periodEnd: `${payment.month}-${new Date(+payment.month.split("-")[0], +payment.month.split("-")[1], 0).getDate()}`,
      paymentDate: payment.paid_date || new Date().toISOString().split("T")[0],
    };
    const doc = generateFromTemplate(frRentReceipt, data);
    downloadPDF(doc, `Quittance_${tenant.name}_${payment.month}.pdf`);
    toast({ title: "Quittance PDF téléchargée" });
  };

  /* ─── Pay rent via Stripe ─── */
  const handlePayRent = async (payment: RentCall) => {
    const tenant = tenants.find(t => t.id === payment.tenant_id);
    if (!tenant || !orgId) return;
    setPayingRentId(payment.id);
    try {
      const { data, error } = await supabase.functions.invoke("create-rent-payment", { body: { rentCallId: payment.id, amount: payment.total_amount, tenantName: tenant.name, month: payment.month, orgId } });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Erreur de paiement", description: err.message, variant: "destructive" });
    } finally { setPayingRentId(null); }
  };

  const handleInviteTenant = async (tenant: Tenant) => { setInvitingTenantId(tenant.id); await sendTenantInvite(tenant); setInvitingTenantId(null); };
  const getPropertyForTenant = (t: Tenant) => properties.find(p => p.id === t.property_id);

  /* ─── Auto rent call on the 25th ─── */
  useEffect(() => {
    if (tenants.length === 0 || rentCalls.length === undefined) return;
    const now = new Date();
    if (now.getDate() >= 25) {
      const nextMonth = now.getMonth() === 11 ? `${now.getFullYear() + 1}-01` : `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, "0")}`;
      const existing = rentCalls.filter(r => r.month === nextMonth);
      if (existing.length === 0 && tenants.some(t => t.rent_amount > 0)) generateMonthlyRentCalls();
    }
  }, [tenants.length]);

  /* ─── Document Builder mode ─── */
  if (selectedTemplate) {
    return <DocumentBuilder template={selectedTemplate} onBack={() => setSelectedTemplate(null)} onGenerated={() => setSelectedTemplate(null)} />;
  }

  /* ─── Inventory Builder mode ─── */
  if (inventoryMode) {
    return (
      <DashboardLayout>
        <InventoryBuilder propertyId={inventoryMode.propertyId} tenantId={inventoryMode.tenantId} reportType={inventoryMode.reportType} propertyLabel={inventoryMode.propertyLabel} onBack={() => setInventoryMode(null)} />
      </DashboardLayout>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     PROPERTY DETAIL VIEW — shows all linked data for a property
     ───────────────────────────────────────────────────────────── */
  if (selectedProperty) {
    const propTenants = tenants.filter(t => t.property_id === selectedProperty.id);
    const propPayments = rentCalls.filter(r => r.property_id === selectedProperty.id).sort((a, b) => b.month.localeCompare(a.month));
    const totalExpenses = propertyExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const groupedFurniture = propertyFurniture.reduce((acc, item) => {
      if (!acc[item.room_name]) acc[item.room_name] = [];
      acc[item.room_name].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto">
          <button onClick={() => setSelectedProperty(null)} className="text-sm text-accent hover:underline mb-4 flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Retour aux biens
          </button>

          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center shrink-0">
              <Home className="h-6 w-6 text-accent-foreground" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">{selectedProperty.label}</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{selectedProperty.address}, {selectedProperty.postal_code} {selectedProperty.city}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { startEditProperty(selectedProperty); setSelectedProperty(null); setActiveTab("properties"); }} className="text-xs text-accent hover:underline flex items-center gap-1"><Edit className="h-3 w-3" />Modifier</button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-card rounded-xl p-4 border border-border/50">
              <p className="text-xs text-muted-foreground">Loyer + Charges</p>
              <p className="text-lg font-bold text-foreground">{fmt(selectedProperty.monthly_rent + selectedProperty.monthly_charges)}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border/50">
              <p className="text-xs text-muted-foreground">Locataire(s)</p>
              <p className="text-lg font-bold text-foreground">{propTenants.length}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border/50">
              <p className="text-xs text-muted-foreground">Dépenses totales</p>
              <p className="text-lg font-bold text-foreground">{fmt(totalExpenses)}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border/50">
              <p className="text-xs text-muted-foreground">États des lieux</p>
              <p className="text-lg font-bold text-foreground">{propertyInventories.length}</p>
            </div>
          </div>

          {/* Locataires */}
          <div className="bg-card rounded-xl border border-border/50 p-5 mb-4">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-accent" />Locataires</h3>
            {propTenants.length === 0 ? <p className="text-sm text-muted-foreground">Aucun locataire affecté.</p> : (
              <div className="space-y-2">
                {propTenants.map(t => (
                  <button key={t.id} onClick={() => { setSelectedTenant(t); setTenantTab("info"); setSelectedProperty(null); }}
                    className="w-full flex items-center gap-3 bg-muted/30 rounded-lg p-3 hover:bg-muted/50 transition-colors text-left">
                    <div className="w-8 h-8 rounded-full bg-gradient-gold flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-accent-foreground">{t.name[0]?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.lease_start || "—"} → {t.lease_end || "—"} · {fmt(t.rent_amount)}/mois</p>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isLeaseActive(t) ? "bg-green-500/20 text-green-700" : "bg-destructive/20 text-destructive"}`}>
                      {isLeaseActive(t) ? "Actif" : "Résilié"}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Paiements */}
          <div className="bg-card rounded-xl border border-border/50 p-5 mb-4">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Euro className="h-4 w-4 text-accent" />Paiements</h3>
            {propPayments.length === 0 ? <p className="text-sm text-muted-foreground">Aucun paiement.</p> : (
              <div className="space-y-1">
                {propPayments.slice(0, 10).map(p => {
                  const tenant = tenants.find(t => t.id === p.tenant_id);
                  return (
                    <div key={p.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${p.paid ? "bg-green-500" : "bg-red-400"}`} />
                        <span className="text-sm text-foreground">{p.month}</span>
                        <span className="text-xs text-muted-foreground">{tenant?.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{fmt(p.total_amount)}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.paid ? "bg-green-500/20 text-green-700" : "bg-red-400/20 text-red-600"}`}>{p.paid ? "Payé" : "Impayé"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dépenses */}
          <div className="bg-card rounded-xl border border-border/50 p-5 mb-4">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Wallet className="h-4 w-4 text-accent" />Dépenses</h3>
            {propertyExpenses.length === 0 ? <p className="text-sm text-muted-foreground">Aucune dépense enregistrée.</p> : (
              <div className="space-y-1">
                {propertyExpenses.slice(0, 10).map(e => (
                  <div key={e.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-foreground">{e.label}</p>
                      <p className="text-xs text-muted-foreground">{e.expense_date} · {EXPENSE_CATEGORIES[e.category] || e.category}</p>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{fmt(Number(e.amount))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* États des lieux */}
          <div className="bg-card rounded-xl border border-border/50 p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-accent" />États des lieux</h3>
              <div className="flex gap-2">
                <button onClick={() => setInventoryMode({ propertyId: selectedProperty.id, tenantId: propTenants[0]?.id, reportType: "entry", propertyLabel: selectedProperty.label })}
                  className="text-xs bg-accent/10 text-accent px-3 py-1.5 rounded-lg hover:bg-accent/20">+ Entrée</button>
                <button onClick={() => setInventoryMode({ propertyId: selectedProperty.id, tenantId: propTenants[0]?.id, reportType: "exit", propertyLabel: selectedProperty.label })}
                  className="text-xs bg-destructive/10 text-destructive px-3 py-1.5 rounded-lg hover:bg-destructive/20">+ Sortie</button>
              </div>
            </div>
            {propertyInventories.length === 0 ? <p className="text-sm text-muted-foreground">Aucun état des lieux.</p> : (
              <div className="space-y-1">
                {propertyInventories.map(inv => {
                  const invTenant = tenants.find(t => t.id === inv.tenant_id);
                  return (
                    <div key={inv.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-foreground">{inv.report_type === "entry" ? "Entrée" : "Sortie"} — {inv.report_date}</p>
                        {invTenant && <p className="text-xs text-muted-foreground">Locataire : {invTenant.name}</p>}
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${inv.status === "completed" ? "bg-green-500/20 text-green-700" : "bg-muted text-muted-foreground"}`}>
                        {inv.status === "completed" ? "Finalisé" : "Brouillon"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Mobilier */}
          {selectedProperty.furnished && (
            <div className="bg-card rounded-xl border border-border/50 p-5 mb-4">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Sofa className="h-4 w-4 text-accent" />Mobilier</h3>
              {propertyFurniture.length === 0 ? <p className="text-sm text-muted-foreground">Aucun meuble enregistré.</p> : (
                <div className="space-y-3">
                  {Object.entries(groupedFurniture).map(([room, items]) => (
                    <div key={room}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{room}</p>
                      <div className="space-y-1">
                        {(items as any[]).map(item => (
                          <div key={item.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-2">
                            <span className="text-sm text-foreground">{item.item_name} <span className="text-muted-foreground">×{item.quantity}</span></span>
                            <span className="text-xs text-muted-foreground">{CONDITIONS_LABEL[item.condition] || item.condition}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  /* ─── Tenant detail mode ─── */
  if (selectedTenant) {
    const tenantPayments = rentCalls.filter(p => p.tenant_id === selectedTenant.id);
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
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isLeaseActive(selectedTenant) ? "bg-green-500/20 text-green-700" : "bg-destructive/20 text-destructive"}`}>
                {isLeaseActive(selectedTenant) ? "Bail actif" : "Bail résilié"}
              </span>
              {selectedTenant.tenant_user_id ? (
                <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Compte actif</span>
              ) : (
                <button onClick={() => handleInviteTenant(selectedTenant)} disabled={invitingTenantId === selectedTenant.id}
                  className="text-xs text-accent hover:underline flex items-center gap-1 disabled:opacity-50">
                  <Link2 className="h-3 w-3" />{invitingTenantId === selectedTenant.id ? "Envoi…" : "Inviter"}
                </button>
              )}
              <button onClick={() => startEditTenant(selectedTenant)} className="text-xs text-accent hover:underline flex items-center gap-1"><Edit className="h-3 w-3" /> Modifier</button>
            </div>
          </div>

          <div className="flex gap-1 mb-6 bg-muted/50 rounded-lg p-1">
            {([
              { key: "info" as const, label: "Fiche", icon: FileText },
              { key: "payments" as const, label: "Paiements", icon: Euro },
              { key: "messages" as const, label: "Échanges", icon: MessageSquare },
              { key: "documents" as const, label: "Documents", icon: Upload },
            ]).map((tab) => (
              <button key={tab.key} onClick={() => { setTenantTab(tab.key); if (tab.key === "messages") loadMessages(selectedTenant.id); }}
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
                  <div><span className="text-xs text-muted-foreground">Date de naissance</span><p className="font-medium text-foreground">{selectedTenant.birth_date || "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Lieu de naissance</span><p className="font-medium text-foreground">{selectedTenant.birth_place || "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Nationalité</span><p className="font-medium text-foreground">{selectedTenant.nationality || "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Profession</span><p className="font-medium text-foreground">{selectedTenant.profession || "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Type de bail</span><p className="font-medium text-foreground">{selectedTenant.lease_type === "furnished" ? "Meublé" : selectedTenant.lease_type === "commercial" ? "Commercial" : "Vide"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Début / Fin</span><p className="font-medium text-foreground">{selectedTenant.lease_start || "—"} → {selectedTenant.lease_end || "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Loyer HC / Charges</span><p className="font-medium text-foreground">{selectedTenant.rent_amount || 0} € / {selectedTenant.charges_amount || 0} €</p></div>
                  <div><span className="text-xs text-muted-foreground">Dépôt de garantie</span><p className="font-medium text-foreground">{selectedTenant.deposit_amount || 0} €</p></div>
                  {selectedTenant.guarantor_name && (
                    <>
                      <div><span className="text-xs text-muted-foreground">Garant</span><p className="font-medium text-foreground">{selectedTenant.guarantor_name}</p></div>
                      <div><span className="text-xs text-muted-foreground">Tél. garant</span><p className="font-medium text-foreground">{selectedTenant.guarantor_phone || "—"}</p></div>
                    </>
                  )}
                </div>
                {selectedTenant.notes && <div className="mt-4 border-t border-border/50 pt-3"><span className="text-xs text-muted-foreground">Notes</span><p className="text-sm text-foreground mt-1">{selectedTenant.notes}</p></div>}
              </div>

              {prop && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                </div>
              )}
            </div>
          )}

          {tenantTab === "payments" && (
            <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
              <h3 className="font-semibold text-foreground mb-4">Historique des paiements</h3>
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
                        <span className="text-sm text-foreground">{p.total_amount} €</span>
                        <button onClick={() => togglePayment(p.id)} className={`text-xs px-2 py-1 rounded ${p.paid ? "bg-green-500/20 text-green-700" : "bg-red-400/20 text-red-600"}`}>
                          {p.paid ? "Payé" : "Impayé"}
                        </button>
                        {p.paid && !p.receipt_validated && <button onClick={() => validateReceipt(p.id)} className="text-xs text-accent hover:underline">Valider quittance</button>}
                        {p.paid && p.receipt_validated && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Accessible</span>}
                        {p.paid && <button onClick={() => generateReceiptForPayment(p)} className="text-muted-foreground hover:text-foreground"><Download className="h-3.5 w-3.5" /></button>}
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
                {messages.map((msg: any) => (
                  <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] rounded-xl px-4 py-2 text-sm ${msg.sender_id === user?.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                      {msg.content}
                      <div className={`text-xs mt-1 ${msg.sender_id === user?.id ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        {new Date(msg.created_at).toLocaleString("fr-FR")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border/50 p-3 flex gap-2">
                <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Écrire un message..." className="flex-1 bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                <button onClick={handleSendMessage} className="bg-primary text-primary-foreground px-3 py-2 rounded-lg hover:opacity-90 transition-opacity"><Send className="h-4 w-4" /></button>
              </div>
            </div>
          )}

          {tenantTab === "documents" && <TenantDocuments tenantId={selectedTenant.id} tenantName={selectedTenant.name} />}
        </div>
      </DashboardLayout>
    );
  }

  /* ─── Property card renderer ─── */
  const renderPropertyCard = (p: Property) => {
    const propTenants = tenants.filter(t => t.property_id === p.id);
    const propUnpaid = rentCalls.filter(r => r.property_id === p.id && !r.paid).length;
    return (
      <div key={p.id} className="bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover transition-all group">
        <div className="flex items-start gap-4">
          <button onClick={() => openPropertyDetail(p)} className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 hover:bg-gradient-gold transition-colors">
            <Home className="h-5 w-5 text-muted-foreground" />
          </button>
          <button onClick={() => openPropertyDetail(p)} className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground text-sm">{p.label}</span>
              {p.lot_number && <span className="text-[10px] font-medium bg-accent/10 text-accent px-2 py-0.5 rounded-full">Lot {p.lot_number}</span>}
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${propTenants.length > 0 ? "bg-green-500/20 text-green-700" : "bg-muted text-muted-foreground"}`}>
                {propTenants.length > 0 ? "Occupé" : "Vacant"}
              </span>
              {p.furnished && <span className="text-[10px] font-medium bg-accent/10 text-accent px-2 py-0.5 rounded-full">Meublé</span>}
              {propUnpaid > 0 && <span className="text-[10px] font-medium bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">{propUnpaid} impayé(s)</span>}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{p.address}{p.city ? `, ${p.postal_code} ${p.city}` : ""}</span>
              {p.surface > 0 && <span>{p.surface} m²</span>}
              {p.rooms > 0 && <span>{p.rooms} pièce{p.rooms > 1 ? "s" : ""}</span>}
              <span>{fmt(p.monthly_rent)}/mois</span>
            </div>
            {propTenants.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {propTenants.map(t => (
                  <span key={t.id} className={`text-xs rounded px-2 py-0.5 ${isLeaseActive(t) ? "bg-green-500/10 text-green-700" : "bg-muted text-muted-foreground"}`}>
                    {t.name} {!isLeaseActive(t) && "(résilié)"}
                  </span>
                ))}
              </div>
            )}
          </button>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => openPropertyDetail(p)} className="text-muted-foreground hover:text-foreground" title="Voir détails"><Eye className="h-4 w-4" /></button>
            <button onClick={() => startEditProperty(p)} className="text-muted-foreground hover:text-foreground"><Edit className="h-4 w-4" /></button>
            <button onClick={() => deleteProperty(p.id)} className="text-muted-foreground/40 hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
    );
  };

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
    "rent-revision": TrendingUp, "charges-regularization": Euro, "unpaid-notice": AlertTriangle,
  };

  if (loading) {
    return <DashboardLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></DashboardLayout>;
  }

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
                { label: "Revenus/mois", value: fmt(totalRent + totalCharges), icon: Euro },
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
                <p className="text-sm text-foreground">{vacantProperties} bien{vacantProperties > 1 ? "s" : ""} vacant{vacantProperties > 1 ? "s" : ""}</p>
              </div>
            )}

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
                <button onClick={generateMonthlyRentCalls} className="flex items-center gap-3 bg-muted/30 rounded-lg p-3 hover:bg-muted/50 transition-colors text-left">
                  <Euro className="h-5 w-5 text-accent" /><span className="text-sm font-medium text-foreground">Appels de loyer du mois</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Properties Tab ─── */}
        {activeTab === "properties" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">{properties.length} bien{properties.length !== 1 ? "s" : ""}</h2>
              <button onClick={() => setShowPropertyForm(true)} className="flex items-center gap-2 bg-gradient-gold text-accent-foreground text-sm font-semibold px-4 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity">
                <Plus className="h-4 w-4" />Ajouter
              </button>
            </div>

            {showPropertyForm && (
              <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">{editingPropertyId ? "Modifier le bien" : "Nouveau bien"}</h3>
                  <button onClick={resetPropertyForm} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Nom du bien *</label>
                      <input value={propertyForm.label} onChange={(e) => setPropertyForm({ ...propertyForm, label: e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Immeuble / Résidence</label>
                      <input value={propertyForm.building_name} onChange={(e) => setPropertyForm({ ...propertyForm, building_name: e.target.value })} placeholder="Ex: Résidence Les Lilas" className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">N° de lot</label>
                      <input value={propertyForm.lot_number} onChange={(e) => setPropertyForm({ ...propertyForm, lot_number: e.target.value })} placeholder="Ex: Lot 12" className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
                      <select value={propertyForm.property_type} onChange={(e) => setPropertyForm({ ...propertyForm, property_type: e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent">
                        {propertyTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select></div>
                  </div>
                  <div><label className="block text-xs font-medium text-muted-foreground mb-1">Adresse</label>
                    <AddressAutocomplete value={propertyForm.address} onChange={(val) => setPropertyForm({ ...propertyForm, address: val })}
                      onSelect={(result: AddressResult) => setPropertyForm({ ...propertyForm, address: result.label || "", postal_code: result.postcode || "", city: result.city || "" })} /></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative"><label className="block text-xs font-medium text-muted-foreground mb-1">Code postal</label>
                      <input value={propertyForm.postal_code} onChange={(e) => handlePostalCodeChange(e.target.value)} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                      {showPostalSuggestions && postalSuggestions.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-32 overflow-y-auto">
                          {postalSuggestions.map((s, i) => (
                            <button key={i} onClick={() => { setPropertyForm(prev => ({ ...prev, city: s.city })); setShowPostalSuggestions(false); }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors">{s.city}</button>
                          ))}
                        </div>
                      )}</div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Ville</label>
                      <input value={propertyForm.city} onChange={(e) => setPropertyForm({ ...propertyForm, city: e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Surface (m²)</label>
                      <input type="number" value={propertyForm.surface || ""} onChange={(e) => setPropertyForm({ ...propertyForm, surface: +e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Pièces</label>
                      <input type="number" value={propertyForm.rooms || ""} onChange={(e) => setPropertyForm({ ...propertyForm, rooms: +e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Étage</label>
                      <input type="number" value={propertyForm.floor ?? ""} onChange={(e) => setPropertyForm({ ...propertyForm, floor: e.target.value ? +e.target.value : undefined })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Chauffage</label>
                      <select value={propertyForm.heating} onChange={(e) => setPropertyForm({ ...propertyForm, heating: e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent">
                        {heatingTypes.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                      </select></div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={propertyForm.furnished} onChange={(e) => setPropertyForm({ ...propertyForm, furnished: e.target.checked })} className="rounded border-border" />
                    <span className="text-sm text-foreground">Meublé</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Loyer HC (€)</label>
                      <input type="number" value={propertyForm.monthly_rent || ""} onChange={(e) => setPropertyForm({ ...propertyForm, monthly_rent: +e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Charges (€)</label>
                      <input type="number" value={propertyForm.monthly_charges || ""} onChange={(e) => setPropertyForm({ ...propertyForm, monthly_charges: +e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Dépôt de garantie (€)</label>
                      <input type="number" value={propertyForm.deposit_amount || ""} onChange={(e) => setPropertyForm({ ...propertyForm, deposit_amount: +e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                  </div>
                  <div><label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
                    <textarea value={propertyForm.notes} onChange={(e) => setPropertyForm({ ...propertyForm, notes: e.target.value })} rows={2} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                  <button onClick={handleSaveProperty} className="bg-gradient-gold text-accent-foreground text-sm font-semibold px-6 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity">
                    {editingPropertyId ? "Enregistrer" : "Ajouter le bien"}
                  </button>
                </div>
              </div>
            )}

            {properties.length === 0 && !showPropertyForm && (
              <div className="text-center py-16">
                <Home className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-foreground mb-1">Aucun bien</h2>
                <p className="text-sm text-muted-foreground">Ajoutez votre premier bien immobilier.</p>
              </div>
            )}

            {/* Grouped by building */}
            {(() => {
              const buildings: Record<string, Property[]> = {};
              const standalone: Property[] = [];
              properties.forEach(p => {
                if (p.building_name) {
                  if (!buildings[p.building_name]) buildings[p.building_name] = [];
                  buildings[p.building_name].push(p);
                } else {
                  standalone.push(p);
                }
              });

              return (
                <>
                  {Object.entries(buildings).map(([bName, bProps]) => (
                    <div key={bName} className="mb-4">
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <Building className="h-4 w-4 text-accent" />
                        <span className="text-sm font-semibold text-foreground">{bName}</span>
                        <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{bProps.length} lot{bProps.length > 1 ? "s" : ""}</span>
                      </div>
                      <div className="space-y-2 ml-6 border-l-2 border-accent/20 pl-4">
                        {bProps.map(p => renderPropertyCard(p))}
                      </div>
                    </div>
                  ))}
                  {standalone.length > 0 && Object.keys(buildings).length > 0 && (
                    <div className="mb-2 px-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Biens individuels</span>
                    </div>
                  )}
                  <div className="space-y-3">
                    {standalone.map(p => renderPropertyCard(p))}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* ─── Tenants Tab ─── */}
        {activeTab === "tenants" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-foreground">{filteredTenants.length} locataire{filteredTenants.length !== 1 ? "s" : ""}</h2>
                <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
                  {([
                    { key: "active" as const, label: "Actifs", count: activeCount },
                    { key: "terminated" as const, label: "Résiliés", count: terminatedCount },
                    { key: "all" as const, label: "Tous", count: tenants.length },
                  ]).map(f => (
                    <button key={f.key} onClick={() => setLeaseFilter(f.key)}
                      className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${leaseFilter === f.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                      {f.label} ({f.count})
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setShowTenantForm(true)} className="flex items-center gap-2 bg-gradient-gold text-accent-foreground text-sm font-semibold px-4 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity">
                <Plus className="h-4 w-4" />Ajouter
              </button>
            </div>

            {showTenantForm && (
              <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">{editingTenantId ? "Modifier le locataire" : "Nouveau locataire"}</h3>
                  <button onClick={resetTenantForm} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Identité</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Nom complet *</label><input value={tenantForm.name} onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Email</label><input type="email" value={tenantForm.email} onChange={(e) => setTenantForm({ ...tenantForm, email: e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Téléphone</label><input type="tel" value={tenantForm.phone} onChange={(e) => setTenantForm({ ...tenantForm, phone: e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Date de naissance</label><input type="date" value={tenantForm.birth_date || ""} onChange={(e) => setTenantForm({ ...tenantForm, birth_date: e.target.value || null })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Lieu de naissance</label><input value={tenantForm.birth_place || ""} onChange={(e) => setTenantForm({ ...tenantForm, birth_place: e.target.value || null })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Nationalité</label><input value={tenantForm.nationality || ""} onChange={(e) => setTenantForm({ ...tenantForm, nationality: e.target.value || null })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Profession</label><input value={tenantForm.profession || ""} onChange={(e) => setTenantForm({ ...tenantForm, profession: e.target.value || null })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                  </div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Bail</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Bien attribué</label>
                      <select value={tenantForm.property_id || ""} onChange={(e) => {
                        const prop = properties.find(p => p.id === e.target.value);
                        setTenantForm({ ...tenantForm, property_id: e.target.value || null, rent_amount: prop?.monthly_rent || tenantForm.rent_amount, charges_amount: prop?.monthly_charges || tenantForm.charges_amount, deposit_amount: prop?.deposit_amount || tenantForm.deposit_amount, lease_type: prop?.furnished ? "furnished" : tenantForm.lease_type });
                      }} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent">
                        <option value="">— Sélectionner un bien —</option>
                        {properties.map(p => <option key={p.id} value={p.id}>{p.label} — {p.address}</option>)}
                      </select></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Type de bail</label>
                      <select value={tenantForm.lease_type} onChange={(e) => setTenantForm({ ...tenantForm, lease_type: e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent">
                        <option value="empty">Bail vide</option><option value="furnished">Bail meublé</option><option value="commercial">Bail commercial</option>
                      </select></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Début du bail</label><input type="date" value={tenantForm.lease_start || ""} onChange={(e) => setTenantForm({ ...tenantForm, lease_start: e.target.value || null })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Fin du bail</label><input type="date" value={tenantForm.lease_end || ""} onChange={(e) => setTenantForm({ ...tenantForm, lease_end: e.target.value || null })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                  </div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Finances</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Loyer HC (€)</label><input type="number" value={tenantForm.rent_amount || ""} onChange={(e) => setTenantForm({ ...tenantForm, rent_amount: +e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Charges (€)</label><input type="number" value={tenantForm.charges_amount || ""} onChange={(e) => setTenantForm({ ...tenantForm, charges_amount: +e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Dépôt (€)</label><input type="number" value={tenantForm.deposit_amount || ""} onChange={(e) => setTenantForm({ ...tenantForm, deposit_amount: +e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                  </div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Garant</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Nom du garant</label><input value={tenantForm.guarantor_name || ""} onChange={(e) => setTenantForm({ ...tenantForm, guarantor_name: e.target.value || null })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Tél. du garant</label><input type="tel" value={tenantForm.guarantor_phone || ""} onChange={(e) => setTenantForm({ ...tenantForm, guarantor_phone: e.target.value || null })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                  </div>
                  <textarea value={tenantForm.notes} onChange={(e) => setTenantForm({ ...tenantForm, notes: e.target.value })} placeholder="Notes" rows={2} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                  <button onClick={handleSaveTenant} className="bg-gradient-gold text-accent-foreground text-sm font-semibold px-6 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity">
                    {editingTenantId ? "Enregistrer" : "Ajouter le locataire"}
                  </button>
                </div>
              </div>
            )}

            {filteredTenants.length === 0 && !showTenantForm && (
              <div className="text-center py-16">
                <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-foreground mb-1">{leaseFilter === "terminated" ? "Aucun bail résilié" : "Aucun locataire"}</h2>
                <p className="text-sm text-muted-foreground">{leaseFilter === "terminated" ? "Tous vos baux sont actifs." : "Ajoutez votre premier locataire."}</p>
              </div>
            )}

            <div className="space-y-3">
              {filteredTenants.map((t) => {
                const prop = getPropertyForTenant(t);
                const active = isLeaseActive(t);
                return (
                  <div key={t.id} className={`flex items-center gap-4 bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover transition-all group ${!active ? "opacity-70" : ""}`}>
                    <button onClick={() => { setSelectedTenant(t); setTenantTab("info"); }} className="flex items-center gap-4 flex-1 text-left">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${active ? "bg-gradient-gold" : "bg-muted"}`}>
                        <span className={`text-sm font-bold ${active ? "text-accent-foreground" : "text-muted-foreground"}`}>{t.name[0]?.toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-sm">{t.name}</span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${active ? "bg-green-500/20 text-green-700" : "bg-destructive/20 text-destructive"}`}>
                            {active ? "Actif" : "Résilié"}
                          </span>
                          {t.tenant_user_id && <span className="text-[10px] font-medium bg-green-500/20 text-green-700 px-2 py-0.5 rounded-full">Compte</span>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                          {prop && <span className="flex items-center gap-1"><Home className="h-3 w-3" />{prop.label}</span>}
                          {t.rent_amount > 0 && <span>{fmt(t.rent_amount)}/mois</span>}
                          <span>{t.lease_start || "—"} → {t.lease_end || "—"}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    </button>
                    <button onClick={() => deleteTenant(t.id)} className="text-muted-foreground/40 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Inventory Tab ─── */}
        {activeTab === "inventory" && (
          <InventoryTab
            properties={properties}
            tenants={tenants}
            orgId={orgId}
            isLeaseActive={isLeaseActive}
            setInventoryMode={setInventoryMode}
          />
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
              <button onClick={generateMonthlyRentCalls} className="flex items-center gap-2 bg-gradient-gold text-accent-foreground text-sm font-semibold px-4 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity">
                <Plus className="h-4 w-4" />Appels du mois
              </button>
            </div>

            {/* Property filter */}
            <div className="flex items-center gap-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select value={paymentPropertyFilter} onChange={e => setPaymentPropertyFilter(e.target.value)}
                className="bg-background border border-border rounded-lg px-3 py-2 text-sm">
                <option value="">Tous les biens</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
              <span className="text-xs text-muted-foreground">{filteredPayments.length} appel(s)</span>
            </div>

            {filteredPayments.length === 0 ? (
              <div className="bg-card rounded-xl shadow-card border border-border/50 p-12 text-center">
                <Euro className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground text-sm">Aucun appel de loyer.</p>
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
                    {filteredPayments.map(p => {
                      const tenant = tenants.find(t => t.id === p.tenant_id);
                      const prop = tenant ? getPropertyForTenant(tenant) : undefined;
                      return (
                        <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-foreground">{tenant?.name || "—"}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{prop?.label || "—"}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{p.month}</td>
                          <td className="px-4 py-3 text-sm font-medium text-foreground">{fmt(p.total_amount)}</td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => togglePayment(p.id)} className={`text-xs px-3 py-1 rounded-full font-medium ${p.paid ? "bg-green-500/20 text-green-700" : "bg-red-400/20 text-red-600"}`}>
                              {p.paid ? "✓ Payé" : "Impayé"}
                            </button>
                            {!p.paid && (
                              <button onClick={() => handlePayRent(p)} disabled={payingRentId === p.id}
                                className="ml-2 inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium bg-accent/20 text-accent hover:bg-accent/30 transition-colors disabled:opacity-50">
                                {payingRentId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CreditCard className="h-3 w-3" />}
                                Payer
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {p.paid && !p.receipt_validated && <button onClick={() => validateReceipt(p.id)} className="text-xs text-accent hover:underline">Valider</button>}
                            {p.paid && p.receipt_validated && <span className="text-xs text-green-600 flex items-center gap-1 justify-end"><CheckCircle className="h-3 w-3" />Validée</span>}
                            {p.paid && <button onClick={() => generateReceiptForPayment(p)} className="text-muted-foreground hover:text-foreground ml-2"><Download className="h-3.5 w-3.5" /></button>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default RentalManagement;
