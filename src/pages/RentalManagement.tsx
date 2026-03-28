import { useState, useEffect, useCallback, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscriptionGating } from "@/hooks/useSubscriptionGating";
import UpgradeBanner from "@/components/subscription/UpgradeBanner";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useCountryFilter } from "@/hooks/useCountryFilter";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useI18n } from "@/lib/i18n";
import DocumentBuilder from "@/components/documents/DocumentBuilder";
import InventoryBuilder from "@/components/rental/InventoryBuilder";
import InventoryTab from "@/components/rental/InventoryTab";
import RentalPropertyDetailView from "@/components/rental/RentalPropertyDetailView";
import RentalTenantDetailView from "@/components/rental/RentalTenantDetailView";
import RentalPaymentsTab from "@/components/rental/RentalPaymentsTab";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRentalData, type Property, type Tenant, type RentCall } from "@/hooks/useRentalData";
import { getTemplatesByCategory } from "@/lib/templates/registry";
import type { DocumentTemplate } from "@/lib/templates/types";
import { getCountryConfig, formatCurrency } from "@/lib/country-config";
import { getCountryEntryOrDefault } from "@/lib/global-country-registry";
// ── Extracted hooks (wired) ──
import { useRentalMessages } from "@/hooks/rental/useRentalMessages";
import { useRentalPropertyDetail } from "@/hooks/rental/useRentalPropertyDetail";
import { useRentalReceipts } from "@/hooks/rental/useRentalReceipts";
import { useRentalLeaseGenerator } from "@/hooks/rental/useRentalLeaseGenerator";
import { useRentalNotifications } from "@/hooks/rental/useRentalNotifications";
import { useRentalPropertyLoader } from "@/hooks/rental/useRentalPropertyLoader";
import {
  Home, FileText, ChevronRight, Plus, Users, Send, X,
  Phone, MapPin, Calendar, Download, Receipt, ClipboardList,
  TrendingUp, AlertTriangle, Building, Eye, Trash2, Euro,
  UserPlus, MessageSquare, Upload, Edit, Search, ArrowLeft,
  CheckCircle, Key, Thermometer, Droplets, Zap, ArrowRight,
  ClipboardCheck, Link2, CalendarClock, CreditCard, Loader2,
  Sofa, Wallet, Filter, CalendarRange, Tag
} from "lucide-react";
import AddressAutocomplete, { type AddressResult } from "@/components/ui/AddressAutocomplete";
import CountrySelect from "@/components/ui/CountrySelect";
import { buildAppUrl } from "@/lib/app-domain";
type Tab = "dashboard" | "properties" | "tenants" | "payments" | "inventory";
type TenantDetailTab = "info" | "messages" | "documents" | "payments";
type LeaseFilter = "all" | "active" | "terminated";

const getFlag = (code: string) => getCountryEntryOrDefault(code).flag;
const getCountryName = (code: string) => getCountryEntryOrDefault(code).name;

// CONDITIONS_LABEL now uses i18n - see render usage
const defaultPropertyForm = {
  label: "", address: "", postal_code: "", city: "", property_type: "apartment" as string,
  surface: 0, rooms: 0, heating: "individual-gas", furnished: false,
  monthly_rent: 0, monthly_charges: 0, deposit_amount: 0, notes: "", floor: undefined as number | undefined,
  building_name: "" as string, lot_number: "" as string, country: "FR" as string,
  payment_day: 1,
};

const defaultTenantForm = {
  name: "", email: "", phone: "", property_id: null as string | null,
  lease_start: null as string | null, lease_end: null as string | null,
  rent_amount: 0, charges_amount: 0, deposit_amount: 0, lease_type: "empty",
  notes: "", birth_date: null as string | null, birth_place: null as string | null,
  nationality: "" as string | null, profession: null as string | null,
  guarantor_name: null as string | null, guarantor_phone: null as string | null,
  caf_apl_amount: 0, payment_day: 1,
};
// EXPENSE_CATEGORIES now uses i18n - see render usage

const escapeEmailHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
const normalizeEmail = (email: string | null | undefined) => (email || "").trim().toLowerCase();
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const RentalManagement = () => {
  const { user, orgId, userCountry } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const cc = useMemo(() => getCountryConfig(userCountry), [userCountry]);
  const fmt = useCallback((n: number) => formatCurrency(n, userCountry), [userCountry]);
  const propertyTypes = cc.propertyTypes;
  const heatingTypes = cc.heatingTypes;
  const L = cc.labels;
  const { toast } = useToast();

  const CONDITIONS_LABEL: Record<string, string> = useMemo(() => ({
    new: t("page.rental.condition_new"), good: t("page.rental.condition_good"),
    fair: t("page.rental.condition_fair"), poor: t("page.rental.condition_poor"),
  }), [t]);

  const EXPENSE_CATEGORIES: Record<string, string> = useMemo(() => ({
    travaux: t("page.rental.expense_works"), assurance: t("page.rental.expense_insurance"),
    taxe_fonciere: t("page.rental.expense_property_tax"), charges_copro: t("page.rental.expense_condo"),
    interet_emprunt: t("page.rental.expense_loan"), frais_gestion: t("page.rental.expense_mgmt"),
    diagnostics: t("page.rental.expense_diag"), honoraires: t("page.rental.expense_fees"),
    other: t("page.rental.expense_other"),
  }), [t]);
  const countryFilter = useCountryFilter();
  const {
    properties, tenants, rentCalls, loading,
    saveProperty, deleteProperty,
    saveTenant, deleteTenant, sendTenantInvite,
    generateMonthlyRentCalls, togglePayment, validateReceipt,
    assignTenantToProperty,
  } = useRentalData(countryFilter);

  const { requiresUpgrade } = useSubscriptionGating();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>((searchParams.get("tab") as Tab) || "dashboard");

  useEffect(() => {
    const tab = searchParams.get("tab") as Tab;
    if (tab && ["dashboard", "properties", "tenants", "payments", "inventory"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const [hasAppliedRecordDeepLink, setHasAppliedRecordDeepLink] = useState(false);
  useEffect(() => {
    if (hasAppliedRecordDeepLink || loading) return;
    const recordId = searchParams.get("record");
    if (!recordId) return;
    const tenant = tenants.find(t => String(t.id) === String(recordId));
    if (tenant) {
      setActiveTab("tenants");
      setSelectedTenant(tenant);
      setHasAppliedRecordDeepLink(true);
      const next = new URLSearchParams(searchParams);
      next.delete("record");
      setSearchParams(next, { replace: true });
      return;
    }
    setTimeout(() => {
      const el = document.getElementById(`payment-${recordId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-accent");
        setTimeout(() => el.classList.remove("ring-2", "ring-accent"), 3000);
        setHasAppliedRecordDeepLink(true);
        const next = new URLSearchParams(searchParams);
        next.delete("record");
        setSearchParams(next, { replace: true });
      }
    }, 100);
  }, [searchParams, tenants, loading, hasAppliedRecordDeepLink, setSearchParams]);

  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [tenantTab, setTenantTab] = useState<TenantDetailTab>("info");
  const [leaseFilter, setLeaseFilter] = useState<LeaseFilter>("active");
  const [paymentPropertyFilter, setPaymentPropertyFilter] = useState("");
  const [inventoryMode, setInventoryMode] = useState<{ propertyId: string; tenantId?: string; reportType: "entry" | "exit"; propertyLabel: string; existingReportId?: string } | null>(null);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [propertyForm, setPropertyForm] = useState(defaultPropertyForm);
  const propertyFormConfig = useMemo(() => getCountryConfig(propertyForm.country || userCountry), [propertyForm.country, userCountry]);
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [tenantForm, setTenantForm] = useState(defaultTenantForm);
  const tenantFormCountry = properties.find((p) => p.id === tenantForm.property_id)?.country || userCountry;
  const tenantFormConfig = useMemo(() => getCountryConfig(tenantFormCountry), [tenantFormCountry]);

  // ── Wired extracted hooks ──
  const { messages, newMessage, setNewMessage, loadMessages, sendMessage } = useRentalMessages(selectedTenant?.id ?? null);
  const { payingRentId, generateReceiptForPayment, handlePayRent } = useRentalReceipts(properties, tenants, userCountry);
  const { autoGenerateLease, autoGenerateFirstRentCall } = useRentalLeaseGenerator(properties, userCountry);
  const { notifyingRentId, invitingTenantId, setInvitingTenantId, handleNotifyRentCall } = useRentalNotifications(tenants, userCountry);
  const {
    propertyExpenses, propertyFurniture, propertyInventories,
    seasonalPropertyIds, salePropertyIds,
    loadPropertyDetail: loadDetail, loadModeBadges,
  } = useRentalPropertyLoader(orgId ?? null);

  const [paymentMethodDialog, setPaymentMethodDialog] = useState<string | null>(null);
  const [postalSuggestions, setPostalSuggestions] = useState<{ city: string; code: string }[]>([]);
  const [showPostalSuggestions, setShowPostalSuggestions] = useState(false);
  const [assignPropertyId, setAssignPropertyId] = useState<string | null>(null);
  const [assignSearch, setAssignSearch] = useState("");
  const [autoGenDone, setAutoGenDone] = useState(false);

  // Reload mode badges when properties change
  useEffect(() => { loadModeBadges(); }, [properties.length, loadModeBadges]);

  const selectedTenantCountry = selectedTenant ? (properties.find((p) => p.id === selectedTenant.property_id)?.country || userCountry) : userCountry;
  const rentalTemplates = getTemplatesByCategory("rental", selectedTenantCountry as any);

  // ── Computed values ──
  const totalRent = tenants.reduce((s, t) => s + (t.rent_amount || 0), 0);
  const totalCharges = tenants.reduce((s, t) => s + (t.charges_amount || 0), 0);
  const unpaidCount = rentCalls.filter(p => !p.paid).length;
  const occupiedProperties = new Set(tenants.filter(t => t.property_id).map(t => t.property_id)).size;
  const vacantProperties = properties.length - occupiedProperties;
  const today = new Date().toISOString().split("T")[0];
  const isLeaseActive = (t: Tenant) => !t.lease_end || t.lease_end >= today;
  const filteredTenants = tenants.filter(t => {
    if (leaseFilter === "active") return isLeaseActive(t);
    if (leaseFilter === "terminated") return !isLeaseActive(t);
    return true;
  });
  const activeCount = tenants.filter(isLeaseActive).length;
  const terminatedCount = tenants.filter(t => !isLeaseActive(t)).length;
  const filteredPayments = paymentPropertyFilter
    ? rentCalls.filter(r => r.property_id === paymentPropertyFilter)
    : rentCalls;
  /* ─── Postal code lookup ─── */
  const handlePostalCodeChange = async (value: string) => {
    setPropertyForm(prev => ({ ...prev, postal_code: value }));
    // Only use French postal code API for France; skip for other countries
    if ((propertyForm.country || userCountry) === "FR" && value.length === 5) {
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
    if (!propertyForm.label.trim()) { toast({ title: t("page.rental.error"), description: t("page.rental.property_name_required"), variant: "destructive" }); return; }
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
      country: p.country || userCountry, payment_day: 1,
    });
    setShowPropertyForm(true);
  };

  const openPropertyDetail = (p: Property) => {
    navigate(`/dashboard/property/${p.id}`);
  };

  /* ─── Tenant handlers ─── */
  const handleSaveTenant = async () => {
    if (!tenantForm.name.trim()) { toast({ title: t("page.rental.error"), description: t("page.rental.tenant_name_required"), variant: "destructive" }); return; }
    const result = await saveTenant(tenantForm as any, editingTenantId || undefined);
    if (result) {
      if (!editingTenantId && tenantForm.email) {
        const newTenant = { ...tenantForm, id: result as string } as Tenant;
        await sendTenantInvite(newTenant);
      }
      if (!editingTenantId && tenantForm.lease_type && tenantForm.property_id) {
        await autoGenerateLease(result as string, tenantForm);
        await autoGenerateFirstRentCall(result as string, tenantForm);
      }
      resetTenantForm();
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
      caf_apl_amount: t.caf_apl_amount ?? 0, payment_day: 1,
    });
    setShowTenantForm(true);
    setSelectedTenant(null);
  };

  /* ─── Message handler (delegates to extracted hook) ─── */
  const handleSendMessage = async () => {
    if (!selectedTenant) return;
    await sendMessage(selectedTenant);
  };

  const handleInviteTenant = async (tenant: Tenant) => { setInvitingTenantId(tenant.id); await sendTenantInvite(tenant); setInvitingTenantId(null); };
  const getPropertyForTenant = (t: Tenant) => properties.find(p => p.id === t.property_id);

  const iconMap: Record<string, typeof Home> = {
    "lease": Home, "rent-receipt": Receipt, "inventory": ClipboardList,
    "rent-revision": TrendingUp, "charges-regularization": Euro, "unpaid-notice": AlertTriangle,
  };

  /* ─── Auto rent call on the 25th (runs once) ─── */
  useEffect(() => {
    if (autoGenDone || tenants.length === 0 || loading) return;
    const now = new Date();
    if (now.getDate() >= 25) {
      setAutoGenDone(true);
      generateMonthlyRentCalls();
    }
  }, [tenants.length, loading, autoGenDone]);

  /* ─── Subscription gating ─── */
  const upgradeNeeded = requiresUpgrade("unlimited_properties");
  if (upgradeNeeded) {
    return (
      <DashboardLayout>
        <UpgradeBanner requiredTier={upgradeNeeded} featureLabel="Gestion locative" />
      </DashboardLayout>
    );
  }

  /* ─── Document Builder mode ─── */
  if (selectedTemplate) {
    return <DocumentBuilder template={selectedTemplate} onBack={() => setSelectedTemplate(null)} onGenerated={() => setSelectedTemplate(null)} />;
  }

  /* ─── Inventory Builder mode ─── */
  if (inventoryMode) {
    return (
      <DashboardLayout>
        <InventoryBuilder propertyId={inventoryMode.propertyId} tenantId={inventoryMode.tenantId} reportType={inventoryMode.reportType} propertyLabel={inventoryMode.propertyLabel} onBack={() => setInventoryMode(null)} existingReportId={inventoryMode.existingReportId} />
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
            <ArrowLeft className="h-3.5 w-3.5" /> {L.properties}
          </button>

          {/* Header — responsive */}
          <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card border border-border/50 mb-6">
            <div className="detail-header">
              <div className="detail-header-main">
                <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center shrink-0">
                  <Home className="h-6 w-6 text-accent-foreground" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <h1 className="text-xl font-bold text-foreground flex items-center gap-2 flex-wrap min-w-0">
                    <span>{getFlag(selectedProperty.country)}</span>
                    <span className="break-words">{selectedProperty.label}</span>
                  </h1>
                  <p className="detail-meta flex items-start gap-1">
                    <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                    <span className="break-words">{selectedProperty.address}, {selectedProperty.postal_code} {selectedProperty.city}</span>
                  </p>
                </div>
              </div>
              <div className="detail-header-actions">
                <button
                  onClick={() => { startEditProperty(selectedProperty); setSelectedProperty(null); setActiveTab("properties"); }}
                  className="text-xs text-accent hover:underline flex items-center gap-1"
                >
                  <Edit className="h-3 w-3" />{L.editProperty}
                </button>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-card rounded-xl p-4 border border-border/50">
              <p className="text-xs text-muted-foreground">{L.rent} + {L.charges}</p>
              <p className="text-lg font-bold text-foreground">{fmt(selectedProperty.monthly_rent + selectedProperty.monthly_charges)}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border/50">
              <p className="text-xs text-muted-foreground">{L.tenants}</p>
              <p className="text-lg font-bold text-foreground">{propTenants.length}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border/50">
              <p className="text-xs text-muted-foreground">{L.totalExpenses}</p>
              <p className="text-lg font-bold text-foreground">{fmt(totalExpenses)}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border/50">
              <p className="text-xs text-muted-foreground">{L.inventoryReports}</p>
              <p className="text-lg font-bold text-foreground">{propertyInventories.length}</p>
            </div>
          </div>

          {/* Locataires */}
          <div className="bg-card rounded-xl border border-border/50 p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2"><Users className="h-4 w-4 text-accent" />{L.tenants}</h3>
              {propTenants.length === 0 && (
                <button
                  onClick={() => setAssignPropertyId(assignPropertyId === selectedProperty.id ? null : selectedProperty.id)}
                   className="text-xs bg-accent/10 text-accent px-3 py-1.5 rounded-lg hover:bg-accent/20 flex items-center gap-1"
                 >
                   <UserPlus className="h-3 w-3" /> {L.assignTenant}
                 </button>
               )}
            </div>
            {propTenants.length === 0 ? (
               <>
                 <p className="text-sm text-muted-foreground">{L.noTenant}.</p>
                {assignPropertyId === selectedProperty.id && (
                  <div className="mt-3 bg-muted/50 border border-border rounded-lg p-3">
                     <div className="flex items-center justify-between mb-2">
                       <span className="text-xs font-semibold text-foreground">{L.assignExisting}</span>
                       <button onClick={() => setAssignPropertyId(null)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                    </div>
                    <input
                      type="text"
                      value={assignSearch}
                      onChange={(e) => setAssignSearch(e.target.value)}
                      placeholder={L.searchTenant}
                      className="w-full bg-background border border-border/50 rounded-md px-2.5 py-1.5 text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {tenants
                        .filter(t => !t.property_id || t.property_id === null)
                        .filter(t => !assignSearch || t.name.toLowerCase().includes(assignSearch.toLowerCase()))
                        .map(t => (
                          <button
                            key={t.id}
                            onClick={async () => {
                              const ok = await assignTenantToProperty(t.id, selectedProperty.id);
                              if (ok) { setAssignPropertyId(null); setSelectedProperty(null); }
                            }}
                            className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-accent/10 transition-colors flex items-center gap-2"
                          >
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span className="text-foreground">{t.name}</span>
                            {t.email && <span className="text-muted-foreground ml-auto">{t.email}</span>}
                          </button>
                        ))}
                       {tenants.filter(t => !t.property_id).filter(t => !assignSearch || t.name.toLowerCase().includes(assignSearch.toLowerCase())).length === 0 && (
                         <p className="text-xs text-muted-foreground text-center py-2">{L.noUnassigned}</p>
                      )}
                    </div>
                    <button
                      onClick={() => { setActiveTab("tenants"); setShowTenantForm(true); setSelectedProperty(null); }}
                      className="w-full mt-2 text-xs text-accent hover:underline flex items-center justify-center gap-1 py-1"
                    >
                      <Plus className="h-3 w-3" /> {L.createNewTenant}
                    </button>
                  </div>
                )}
              </>
            ) : (
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
                    <span className={`inline-flex items-center justify-center whitespace-nowrap h-6 text-xs px-2.5 rounded-full font-medium ${isLeaseActive(t) ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                      {isLeaseActive(t) ? L.active : L.terminated}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Paiements */}
           <div className="bg-card rounded-xl border border-border/50 p-5 mb-4">
             <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Euro className="h-4 w-4 text-accent" />{L.payments}</h3>
            {propPayments.length === 0 ? <p className="text-sm text-muted-foreground">{L.noPayment}</p> : (
              <div className="space-y-1">
                {propPayments.slice(0, 10).map(p => {
                  const tenant = tenants.find(t => t.id === p.tenant_id);
                  return (
                    <div key={p.id} className="detail-row bg-muted/30 rounded-lg px-4 py-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-2 h-2 rounded-full ${p.paid ? "bg-success" : "bg-destructive"}`} />
                        <span className="text-sm text-foreground">{p.month}</span>
                        <span className="text-xs text-muted-foreground">{tenant?.name}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
                        <span className="text-sm font-medium text-foreground">{fmt(p.total_amount)}</span>
                        <span className={`inline-flex items-center justify-center whitespace-nowrap h-6 text-xs px-2.5 rounded-full font-medium ${p.paid ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{p.paid ? L.paid : L.unpaid}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dépenses */}
          <div className="bg-card rounded-xl border border-border/50 p-5 mb-4">
             <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Wallet className="h-4 w-4 text-accent" />{L.totalExpenses}</h3>
             {propertyExpenses.length === 0 ? <p className="text-sm text-muted-foreground">{L.noExpense}</p> : (
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
               <h3 className="font-semibold text-foreground flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-accent" />{L.inventoryReports}</h3>
               <div className="flex gap-2">
                 <button onClick={() => setInventoryMode({ propertyId: selectedProperty.id, tenantId: propTenants[0]?.id, reportType: "entry", propertyLabel: selectedProperty.label })}
                   className="text-xs bg-accent/10 text-accent px-3 py-1.5 rounded-lg hover:bg-accent/20">+ {L.entry}</button>
                 <button onClick={() => setInventoryMode({ propertyId: selectedProperty.id, tenantId: propTenants[0]?.id, reportType: "exit", propertyLabel: selectedProperty.label })}
                   className="text-xs bg-destructive/10 text-destructive px-3 py-1.5 rounded-lg hover:bg-destructive/20">+ {L.exit}</button>
               </div>
            </div>
            {propertyInventories.length === 0 ? <p className="text-sm text-muted-foreground">{L.noInventory}</p> : (
              <div className="space-y-1">
                {propertyInventories.map(inv => {
                  const invTenant = tenants.find(t => t.id === inv.tenant_id);
                  return (
                    <div key={inv.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-2.5">
                      <div>
                         <p className="text-sm font-medium text-foreground">{inv.report_type === "entry" ? L.entry : L.exit} — {inv.report_date}</p>
                         {invTenant && <p className="text-xs text-muted-foreground">{L.tenant_label} : {invTenant.name}</p>}
                      </div>
                      <span className={`inline-flex items-center justify-center whitespace-nowrap h-6 text-xs px-2.5 rounded-full font-medium ${inv.status === "completed" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        {inv.status === "completed" ? L.completed : L.draft}
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
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Sofa className="h-4 w-4 text-accent" />{t("page.rental.furniture")}</h3>
              {propertyFurniture.length === 0 ? <p className="text-sm text-muted-foreground">{L.noFurniture}</p> : (
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
             <ArrowLeft className="h-3.5 w-3.5" /> {L.tenants}
          </button>
          {/* Profile header — responsive: stacks on mobile */}
          <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card border border-border/50 mb-6">
            <div className="detail-header">
              <div className="detail-header-main">
                <div className="w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center shrink-0">
                  <span className="text-lg font-bold text-accent-foreground">{selectedTenant.name[0]?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-foreground break-words">{selectedTenant.name}</h1>
                  <p className="detail-meta">{prop ? `${prop.label} — ${prop.address}, ${prop.city}` : L.noProperty}</p>
                </div>
              </div>
              <div className="detail-header-actions">
                <span className={`inline-flex items-center justify-center whitespace-nowrap h-6 text-xs px-2.5 rounded-full font-medium ${isLeaseActive(selectedTenant) ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                  {isLeaseActive(selectedTenant) ? L.active : L.terminated}
                </span>
                {selectedTenant.tenant_user_id ? (
                  <span className="detail-action-btn text-xs text-success flex items-center gap-1"><CheckCircle className="h-3 w-3" />{L.connected}</span>
                ) : (
                  <button
                    onClick={() => handleInviteTenant(selectedTenant)}
                    disabled={invitingTenantId === selectedTenant.id}
                    className="detail-action-btn text-xs text-accent hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    <Link2 className="h-3 w-3" />{invitingTenantId === selectedTenant.id ? L.sending : L.invite}
                  </button>
                )}
                <button onClick={() => startEditTenant(selectedTenant)} className="detail-action-btn text-xs text-accent hover:underline flex items-center gap-1">
                  <Edit className="h-3 w-3" /> {L.editTenant}
                </button>
              </div>
            </div>
          </div>

          {/* Tabs — horizontal scroll on mobile */}
          <div className="detail-tab-row mb-6">
             {([
               { key: "info" as const, label: L.overview, short: L.overview.slice(0, 8), icon: FileText },
               { key: "payments" as const, label: L.payments, short: L.payments.slice(0, 8), icon: Euro },
               { key: "messages" as const, label: "Messages", short: "Msgs", icon: MessageSquare },
               { key: "documents" as const, label: "Documents", short: "Docs", icon: Upload },
             ]).map((tab) => (
               <button key={tab.key} onClick={() => { setTenantTab(tab.key); if (tab.key === "messages") loadMessages(selectedTenant.id); }}
                 className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors shrink-0 whitespace-nowrap ${tenantTab === tab.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                 <tab.icon className="h-4 w-4 shrink-0" />
                 <span className="sm:hidden">{tab.short}</span>
                 <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {tenantTab === "info" && (
            <div className="space-y-4">
              <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                   <div><span className="text-xs text-muted-foreground">{L.email}</span><p className="font-medium text-foreground">{selectedTenant.email || "—"}</p></div>
                   <div><span className="text-xs text-muted-foreground">{L.phone}</span><p className="font-medium text-foreground">{selectedTenant.phone || "—"}</p></div>
                   <div><span className="text-xs text-muted-foreground">{L.birthDate}</span><p className="font-medium text-foreground">{selectedTenant.birth_date || "—"}</p></div>
                   <div><span className="text-xs text-muted-foreground">{L.birthPlace}</span><p className="font-medium text-foreground">{selectedTenant.birth_place || "—"}</p></div>
                   <div><span className="text-xs text-muted-foreground">{L.nationality}</span><p className="font-medium text-foreground">{selectedTenant.nationality || "—"}</p></div>
                   <div><span className="text-xs text-muted-foreground">{L.profession}</span><p className="font-medium text-foreground">{selectedTenant.profession || "—"}</p></div>
                   <div><span className="text-xs text-muted-foreground">{L.leaseType}</span><p className="font-medium text-foreground">{cc.leaseTypes.find(lt => lt.value === selectedTenant.lease_type)?.label || selectedTenant.lease_type}</p></div>
                   <div><span className="text-xs text-muted-foreground">{L.leaseStart} / {L.leaseEnd}</span><p className="font-medium text-foreground">{selectedTenant.lease_start || "—"} → {selectedTenant.lease_end || "—"}</p></div>
                   <div><span className="text-xs text-muted-foreground">{L.rent} / {L.charges}</span><p className="font-medium text-foreground">{fmt(selectedTenant.rent_amount || 0)} / {fmt(selectedTenant.charges_amount || 0)}</p></div>
                   <div><span className="text-xs text-muted-foreground">{L.deposit}</span><p className="font-medium text-foreground">{fmt(selectedTenant.deposit_amount || 0)}</p></div>
                  {selectedTenant.guarantor_name && (
                     <>
                       <div><span className="text-xs text-muted-foreground">{L.guarantor}</span><p className="font-medium text-foreground">{selectedTenant.guarantor_name}</p></div>
                       <div><span className="text-xs text-muted-foreground">{L.guarantorPhone}</span><p className="font-medium text-foreground">{selectedTenant.guarantor_phone || "—"}</p></div>
                     </>
                  )}
                </div>
                {selectedTenant.notes && <div className="mt-4 border-t border-border/50 pt-3"><span className="text-xs text-muted-foreground">{L.notes}</span><p className="text-sm text-foreground mt-1">{selectedTenant.notes}</p></div>}
              </div>

              {prop && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   <button onClick={() => setInventoryMode({ propertyId: prop.id, tenantId: selectedTenant.id, reportType: "entry", propertyLabel: prop.label })}
                     className="flex items-center gap-3 bg-card rounded-xl p-4 shadow-card border border-border/50 hover:shadow-card-hover transition-all text-left">
                     <ClipboardCheck className="h-5 w-5 text-accent" />
                     <div><div className="text-sm font-medium text-foreground">{L.entryInventory}</div><div className="text-xs text-muted-foreground">{L.roomByRoom}</div></div>
                   </button>
                   <button onClick={() => setInventoryMode({ propertyId: prop.id, tenantId: selectedTenant.id, reportType: "exit", propertyLabel: prop.label })}
                     className="flex items-center gap-3 bg-card rounded-xl p-4 shadow-card border border-border/50 hover:shadow-card-hover transition-all text-left">
                     <ClipboardCheck className="h-5 w-5 text-destructive" />
                     <div><div className="text-sm font-medium text-foreground">{L.exitInventory}</div><div className="text-xs text-muted-foreground">{L.compareEntry}</div></div>
                  </button>
                </div>
              )}
            </div>
          )}

          {tenantTab === "payments" && (
            <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
               <h3 className="font-semibold text-foreground mb-4">{L.paymentHistory}</h3>
               {tenantPayments.length === 0 ? (
                 <p className="text-sm text-muted-foreground">{L.noPayment}</p>
              ) : (
                <div className="space-y-2">
                  {tenantPayments.sort((a, b) => b.month.localeCompare(a.month)).map(p => (
                    <div key={p.id} className="detail-row bg-muted/30 rounded-lg px-4 py-2.5 relative">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full ${p.paid ? "bg-success" : "bg-destructive"}`} />
                        <span className="text-sm font-medium text-foreground">{p.month}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 justify-start sm:justify-end">
                        <span className="text-sm text-foreground">{fmt(p.total_amount)}</span>
                        {p.paid ? (
                           <button onClick={() => togglePayment(p.id)} className="inline-flex items-center justify-center whitespace-nowrap h-6 text-xs px-2.5 rounded-full font-medium bg-success/10 text-success">
                             {L.paid}
                           </button>
                        ) : (
                           <button onClick={() => setPaymentMethodDialog(p.id)} className="inline-flex items-center justify-center whitespace-nowrap h-6 text-xs px-2.5 rounded-full font-medium bg-destructive/10 text-destructive">
                             {L.unpaid}
                           </button>
                        )}
                        {paymentMethodDialog === p.id && (
                          <div className="absolute right-4 top-10 bg-card border border-border rounded-xl shadow-lg p-3 z-50 w-48">
                             {[
                               { id: "online", label: L.online, icon: CreditCard },
                               { id: "bank_transfer", label: L.transfer, icon: Wallet },
                               { id: "cash", label: L.cash, icon: Euro },
                             ].map(m => (
                               <button key={m.id} onClick={() => { togglePayment(p.id, m.id); setPaymentMethodDialog(null); }}
                                 className="flex items-center gap-2 w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted transition-colors">
                                <m.icon className="h-3.5 w-3.5 text-muted-foreground" />
                                {m.label}
                              </button>
                            ))}
                            <button onClick={() => setPaymentMethodDialog(null)} className="mt-1 text-[10px] text-muted-foreground w-full text-center">{L.cancel}</button>
                          </div>
                        )}
                         {p.paid && !p.receipt_validated && <button onClick={() => validateReceipt(p.id)} className="text-xs text-accent hover:underline">{L.validateReceipt}</button>}
                         {p.paid && p.receipt_validated && <span className="text-xs text-success flex items-center gap-1"><CheckCircle className="h-3 w-3" />{L.accessible}</span>}
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
                {messages.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">{L.noExchange}</p>}
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

          {tenantTab === "documents" && (
            <div className="space-y-6">
              <TenantDocuments tenantId={selectedTenant.id} tenantName={selectedTenant.name} />

              {/* Demandes du locataire */}
              <TenantRequestsPanel tenantId={selectedTenant.id} tenantName={selectedTenant.name} />

              {/* Modèles de documents */}
              <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
                <h3 className="font-semibold text-foreground mb-4">Générer un document</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {rentalTemplates.map((t) => {
                    const Icon = Object.entries(iconMap).find(([k]) => t.docType.includes(k))?.[1] || FileText;
                    return (
                      <button key={t.id} onClick={() => setSelectedTemplate(t)}
                        className="flex items-start gap-3 bg-muted/30 rounded-lg p-4 hover:bg-muted/50 transition-colors text-left group">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center group-hover:bg-gradient-gold transition-colors shrink-0">
                          <Icon className="h-4 w-4 text-muted-foreground group-hover:text-accent-foreground transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground text-sm">{t.label}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 mt-1 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  /* ─── Property card renderer ─── */
  const renderPropertyCard = (p: Property) => {
    const propTenants = tenants.filter(t => t.property_id === p.id);
    const propUnpaid = rentCalls.filter(r => r.property_id === p.id && !r.paid).length;
    const propPaid = rentCalls.filter(r => r.property_id === p.id && r.paid);
    const propRevenue = propPaid.reduce((s, r) => s + (r.total_amount || 0), 0);
    const hasPhoto = Array.isArray(p.photo_urls) && p.photo_urls.length > 0;
    const isSeasonal = seasonalPropertyIds.has(p.id);
    const isForSale = salePropertyIds.has(p.id);
    const hasLongTerm = propTenants.some(t => isLeaseActive(t));

    return (
      <div key={p.id} className="bg-card rounded-xl shadow-card border border-border/50 hover:shadow-card-hover transition-all group overflow-hidden">
        <div className="flex">
          {/* Photo thumbnail */}
          <button
            onClick={() => openPropertyDetail(p)}
            className="w-20 sm:w-28 shrink-0 bg-muted flex items-center justify-center overflow-hidden"
          >
            {hasPhoto ? (
              <img src={p.photo_urls[0]} alt={p.label} className="w-full h-full object-cover" />
            ) : (
              <Home className="h-6 w-6 text-muted-foreground" />
            )}
          </button>

          <div className="flex-1 min-w-0 p-4">
            {/* Title row */}
            <div onClick={() => openPropertyDetail(p)} className="cursor-pointer">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm">{getFlag(p.country)}</span>
                <span className="font-semibold text-foreground text-sm">{p.label}</span>
                {p.lot_number && <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full font-medium">Lot {p.lot_number}</span>}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{p.address}{p.city ? `, ${p.postal_code} ${p.city}` : ""}</span>
                {p.surface > 0 && <span>{p.surface} {cc.surfaceUnit}</span>}
                {p.rooms > 0 && <span>{p.rooms} {L.rooms_suffix}</span>}
              </div>
            </div>

            {/* Status + mode badges */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {/* Occupancy */}
              {propTenants.length > 0 ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-success/10 text-success px-2 py-0.5 rounded-full">
                  <CheckCircle className="h-3 w-3" /> {L.occupied}
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full cursor-pointer hover:bg-muted/80"
                  onClick={(e) => { e.stopPropagation(); setAssignPropertyId(assignPropertyId === p.id ? null : p.id); setAssignSearch(""); }}
                >
                  {L.vacantAssign}
                </span>
              )}
              {p.furnished && <span className="text-[10px] font-medium bg-accent/10 text-accent px-2 py-0.5 rounded-full">{L.furnished}</span>}
              {propUnpaid > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                  <AlertTriangle className="h-3 w-3" /> {propUnpaid} {L.unpaidN}
                </span>
              )}
              {/* Mode indicators */}
              {hasLongTerm && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  <Key className="h-3 w-3" /> {t("page.property.mode_longterm") || "Long-term"}
                </span>
              )}
              {isSeasonal && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-info/10 text-info px-2 py-0.5 rounded-full">
                  <CalendarRange className="h-3 w-3" /> {t("page.property.mode_seasonal") || "Seasonal"}
                </span>
              )}
              {isForSale && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-success/10 text-success px-2 py-0.5 rounded-full">
                  <Tag className="h-3 w-3" /> {t("page.property.mode_sale") || "For sale"}
                </span>
              )}
            </div>

            {/* Rent + revenue strip */}
            <div className="flex items-center gap-4 mt-2 text-xs">
              <span className="font-semibold text-foreground">{fmt(p.monthly_rent + p.monthly_charges)}<span className="text-muted-foreground font-normal">{L.perMonth}</span></span>
              {propRevenue > 0 && (
                <span className="text-success flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> {fmt(propRevenue)}
                </span>
              )}
            </div>

            {/* Tenant chips */}
            {propTenants.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {propTenants.map(t => (
                  <span key={t.id} className={`text-[10px] rounded-full px-2 py-0.5 ${isLeaseActive(t) ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    {t.name} {!isLeaseActive(t) && `(${L.terminated_label})`}
                  </span>
                ))}
              </div>
            )}

            {/* Assign tenant inline */}
            {assignPropertyId === p.id && (
              <div className="mt-3 bg-muted/50 border border-border rounded-lg p-3" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-foreground">{L.assignExisting}</span>
                  <button onClick={(e) => { e.stopPropagation(); setAssignPropertyId(null); }} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                </div>
                <input
                  type="text"
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  placeholder={L.searchTenant}
                  className="w-full bg-background border border-border/50 rounded-md px-2.5 py-1.5 text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-accent"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {tenants
                    .filter(t => !t.property_id || t.property_id === null)
                    .filter(t => !assignSearch || t.name.toLowerCase().includes(assignSearch.toLowerCase()))
                    .map(t => (
                      <button
                        key={t.id}
                        onClick={async (e) => {
                          e.stopPropagation();
                          const ok = await assignTenantToProperty(t.id, p.id);
                          if (ok) setAssignPropertyId(null);
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-accent/10 transition-colors flex items-center gap-2"
                      >
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-foreground">{t.name}</span>
                        {t.email && <span className="text-muted-foreground ml-auto">{t.email}</span>}
                      </button>
                    ))}
                  {tenants.filter(t => !t.property_id).filter(t => !assignSearch || t.name.toLowerCase().includes(assignSearch.toLowerCase())).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">{L.noUnassigned}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col items-center gap-1.5 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => openPropertyDetail(p)} className="text-muted-foreground hover:text-foreground" title={t("page.rental.view_details")}><Eye className="h-4 w-4" /></button>
            <button onClick={() => startEditProperty(p)} className="text-muted-foreground hover:text-foreground"><Edit className="h-4 w-4" /></button>
            <button onClick={() => deleteProperty(p.id)} className="text-muted-foreground/40 hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
    );
  };

  /* ─── Tabs bar ─── */
  const tabs: { key: Tab; label: string; icon: typeof Home }[] = [
    { key: "dashboard", label: L.overview, icon: Building },
    { key: "properties", label: L.properties, icon: Home },
    { key: "tenants", label: L.tenants, icon: Users },
    { key: "inventory", label: L.inventory, icon: ClipboardCheck },
    { key: "payments", label: L.payments, icon: Euro },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Skeleton header */}
          <div className="space-y-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          {/* Skeleton tabs */}
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-28 rounded-lg" />
            ))}
          </div>
          {/* Skeleton stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border/50 p-4 space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-7 w-16" />
              </div>
            ))}
          </div>
          {/* Skeleton list */}
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">{L.rentalManagement}</h1>
          <p className="text-muted-foreground text-sm mt-1">{L.rentalDesc}</p>
        </div>

        {/* Tab bar */}
        <div className="detail-tab-row mb-6">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex shrink-0 items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <tab.icon className="h-4 w-4" />{tab.label}
            </button>
          ))}
        </div>

        {/* ─── Dashboard Tab ─── */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: L.properties, value: properties.length, icon: Home, tab: "properties" as Tab },
                { label: L.occupied, value: occupiedProperties, icon: Key, tab: "properties" as Tab },
                { label: L.revenueMonth, value: fmt(totalRent + totalCharges), icon: Euro, tab: "payments" as Tab },
                { label: L.unpaidCount, value: unpaidCount, icon: AlertTriangle, danger: unpaidCount > 0, tab: "payments" as Tab },
              ].map((kpi) => (
                <button key={kpi.label} onClick={() => setActiveTab(kpi.tab)} className="bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover transition-all text-left group">
                  <div className="flex items-center gap-2 mb-1">
                    <kpi.icon className={`h-4 w-4 ${kpi.danger ? "text-destructive" : "text-muted-foreground"}`} />
                    <span className="text-xs text-muted-foreground">{kpi.label}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors ml-auto" />
                  </div>
                  <div className={`text-2xl font-bold ${kpi.danger ? "text-destructive" : "text-foreground"}`}>{kpi.value}</div>
                </button>
              ))}
            </div>

            {vacantProperties > 0 && (
              <div className="flex items-start gap-3 bg-warning/10 border border-warning/30 rounded-lg p-4">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{vacantProperties} {L.property} {L.vacant}</p>
              </div>
            )}

            <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
              <h3 className="font-semibold text-foreground mb-4">{L.quickActions}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <button onClick={() => { setActiveTab("properties"); setShowPropertyForm(true); }} className="flex items-center gap-3 bg-muted/30 rounded-lg p-3 hover:bg-muted/50 transition-colors text-left">
                  <Plus className="h-5 w-5 text-accent" /><span className="text-sm font-medium text-foreground">{L.addProperty}</span>
                </button>
                <button onClick={() => { setActiveTab("tenants"); setShowTenantForm(true); }} className="flex items-center gap-3 bg-muted/30 rounded-lg p-3 hover:bg-muted/50 transition-colors text-left">
                  <UserPlus className="h-5 w-5 text-accent" /><span className="text-sm font-medium text-foreground">{L.addTenant}</span>
                </button>
                <button onClick={generateMonthlyRentCalls} className="flex items-center gap-3 bg-muted/30 rounded-lg p-3 hover:bg-muted/50 transition-colors text-left">
                  <Euro className="h-5 w-5 text-accent" /><span className="text-sm font-medium text-foreground">{L.monthCalls}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Properties Tab ─── */}
        {activeTab === "properties" && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="font-semibold text-foreground">{properties.length} {L.properties.toLowerCase()}</h2>
              <button onClick={() => setShowPropertyForm(true)} className="flex items-center gap-2 bg-gradient-gold text-accent-foreground text-sm font-semibold px-4 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity min-h-[44px] w-full sm:w-auto justify-center sm:justify-start">
                <Plus className="h-4 w-4" />{L.addProperty}
              </button>
            </div>

            {showPropertyForm && (
              <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">{editingPropertyId ? L.editProperty : L.addProperty}</h3>
                  <button onClick={resetPropertyForm} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">{L.propertyName} *</label>
                      <input value={propertyForm.label} onChange={(e) => setPropertyForm({ ...propertyForm, label: e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">{L.building}</label>
                      <input value={propertyForm.building_name} onChange={(e) => setPropertyForm({ ...propertyForm, building_name: e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">{L.lotNumber}</label>
                      <input value={propertyForm.lot_number} onChange={(e) => setPropertyForm({ ...propertyForm, lot_number: e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">{L.propertyType}</label>
                      <select value={propertyForm.property_type} onChange={(e) => setPropertyForm({ ...propertyForm, property_type: e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent">
                        {propertyFormConfig.propertyTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">{L.country}</label>
                      <CountrySelect value={propertyForm.country || userCountry} onChange={(code) => setPropertyForm({ ...propertyForm, country: code })} /></div>
                  </div>
                  <div><label className="block text-xs font-medium text-muted-foreground mb-1">{L.address}</label>
                    <AddressAutocomplete value={propertyForm.address} onChange={(val) => setPropertyForm({ ...propertyForm, address: val })}
                      onSelect={(result: AddressResult) => {
                        const fullAddr = result.housenumber && result.street
                          ? `${result.housenumber} ${result.street}`
                          : result.street || result.label || "";
                        setPropertyForm({ ...propertyForm, address: fullAddr.trim(), postal_code: result.postcode || "", city: result.city || "" });
                      }}
                      countryCode={propertyForm.country || userCountry} /></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative"><label className="block text-xs font-medium text-muted-foreground mb-1">{L.postalCode}</label>
                      <input value={propertyForm.postal_code} onChange={(e) => handlePostalCodeChange(e.target.value)} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                      {showPostalSuggestions && postalSuggestions.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-32 overflow-y-auto">
                          {postalSuggestions.map((s, i) => (
                            <button key={i} onClick={() => { setPropertyForm(prev => ({ ...prev, city: s.city })); setShowPostalSuggestions(false); }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors">{s.city}</button>
                          ))}
                        </div>
                      )}</div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">{L.city}</label>
                      <input value={propertyForm.city} onChange={(e) => setPropertyForm({ ...propertyForm, city: e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">{L.surface} ({propertyFormConfig.surfaceUnit})</label>
                      <input type="number" value={propertyForm.surface || ""} onChange={(e) => setPropertyForm({ ...propertyForm, surface: +e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                     <div><label className="block text-xs font-medium text-muted-foreground mb-1">{L.rooms}</label>
                       <input type="number" value={propertyForm.rooms === 0 ? "" : propertyForm.rooms} onChange={(e) => setPropertyForm({ ...propertyForm, rooms: e.target.value === "" ? 0 : +e.target.value })} placeholder="" className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">{L.floor}</label>
                      <input type="number" value={propertyForm.floor ?? ""} onChange={(e) => setPropertyForm({ ...propertyForm, floor: e.target.value ? +e.target.value : undefined })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">{L.heating}</label>
                      <select value={propertyForm.heating} onChange={(e) => setPropertyForm({ ...propertyForm, heating: e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent">
                        {propertyFormConfig.heatingTypes.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                      </select></div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={propertyForm.furnished} onChange={(e) => setPropertyForm({ ...propertyForm, furnished: e.target.checked })} className="rounded border-border" />
                    <span className="text-sm text-foreground">{L.furnished}</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                     <div><label className="block text-xs font-medium text-muted-foreground mb-1">{L.rent} ({propertyFormConfig.currencySymbol})</label>
                       <input type="number" value={propertyForm.monthly_rent || ""} onChange={(e) => setPropertyForm({ ...propertyForm, monthly_rent: +e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                     <div><label className="block text-xs font-medium text-muted-foreground mb-1">{L.charges} ({propertyFormConfig.currencySymbol})</label>
                      <input type="number" value={propertyForm.monthly_charges || ""} onChange={(e) => setPropertyForm({ ...propertyForm, monthly_charges: +e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">{L.deposit} ({propertyFormConfig.currencySymbol})</label>
                      <input type="number" value={propertyForm.deposit_amount || ""} onChange={(e) => setPropertyForm({ ...propertyForm, deposit_amount: +e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                  </div>
                  <div><label className="block text-xs font-medium text-muted-foreground mb-1">{L.notes}</label>
                    <textarea value={propertyForm.notes} onChange={(e) => setPropertyForm({ ...propertyForm, notes: e.target.value })} rows={2} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                  <button onClick={handleSaveProperty} className="bg-gradient-gold text-accent-foreground text-sm font-semibold px-6 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity">
                    {editingPropertyId ? L.save : L.addProperty}
                  </button>
                </div>
              </div>
            )}

            {properties.length === 0 && !showPropertyForm && (
              <div className="text-center py-16">
                <Home className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                 <h2 className="text-lg font-semibold text-foreground mb-1">{L.noPropertyTitle}</h2>
                 <p className="text-sm text-muted-foreground">{L.addFirstProperty}</p>
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
                        <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{bProps.length} {L.lots}{bProps.length > 1 ? "s" : ""}</span>
                      </div>
                      <div className="space-y-2 ml-6 border-l-2 border-accent/20 pl-4">
                        {bProps.map(p => renderPropertyCard(p))}
                      </div>
                    </div>
                  ))}
                  {standalone.length > 0 && Object.keys(buildings).length > 0 && (
                    <div className="mb-2 px-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{L.individualProperties}</span>
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
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex items-center justify-between">
                 <h2 className="font-semibold text-foreground">{filteredTenants.length} {L.tenants.toLowerCase()}</h2>
                 <button onClick={() => setShowTenantForm(true)} className="flex items-center gap-2 bg-gradient-gold text-accent-foreground text-sm font-semibold px-4 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity min-h-[44px]">
                   <Plus className="h-4 w-4" />{L.addTenant}
                 </button>
              </div>
              <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5 overflow-x-auto">
                   {([
                     { key: "active" as const, label: L.active, count: activeCount },
                     { key: "terminated" as const, label: L.terminated, count: terminatedCount },
                     { key: "all" as const, label: L.all, count: tenants.length },
                   ]).map(f => (
                     <button key={f.key} onClick={() => setLeaseFilter(f.key)}
                       className={`text-xs px-3 py-2 rounded-md font-medium transition-colors shrink-0 min-h-[36px] ${leaseFilter === f.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                       {f.label} ({f.count})
                     </button>
                   ))}
              </div>
            </div>

            {showTenantForm && (
              <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">{editingTenantId ? L.editTenant : L.addTenant}</h3>
                  <button onClick={resetTenantForm} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{L.fullName}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">{L.fullName} *</label><input value={tenantForm.name} onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">{L.email}</label><input type="email" value={tenantForm.email} onChange={(e) => setTenantForm({ ...tenantForm, email: e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">{L.phone}</label><input type="tel" value={tenantForm.phone} onChange={(e) => setTenantForm({ ...tenantForm, phone: e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">{L.birthDate}</label><input type="date" value={tenantForm.birth_date || ""} onChange={(e) => setTenantForm({ ...tenantForm, birth_date: e.target.value || null })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">{L.birthPlace}</label><input value={tenantForm.birth_place || ""} onChange={(e) => setTenantForm({ ...tenantForm, birth_place: e.target.value || null })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">{L.nationality}</label><CountrySelect value={tenantForm.nationality || ""} onChange={(code) => setTenantForm({ ...tenantForm, nationality: code || null })} placeholder={L.nationality} /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">{L.profession}</label><input value={tenantForm.profession || ""} onChange={(e) => setTenantForm({ ...tenantForm, profession: e.target.value || null })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                  </div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">{L.leaseType}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">{L.property}</label>
                      <select value={tenantForm.property_id || ""} onChange={(e) => {
                        const prop = properties.find(p => p.id === e.target.value);
                        setTenantForm({ ...tenantForm, property_id: e.target.value || null, rent_amount: prop?.monthly_rent || tenantForm.rent_amount, charges_amount: prop?.monthly_charges || tenantForm.charges_amount, deposit_amount: prop?.deposit_amount || tenantForm.deposit_amount, lease_type: prop?.furnished ? "furnished" : tenantForm.lease_type });
                      }} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent">
                        <option value="">{L.selectProperty}</option>
                        {properties.map(p => <option key={p.id} value={p.id}>{getFlag((p as any).country || userCountry)} {p.label} — {p.address}</option>)}
                      </select></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">{L.leaseType}</label>
                      <select value={tenantForm.lease_type} onChange={(e) => setTenantForm({ ...tenantForm, lease_type: e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent">
                        {tenantFormConfig.leaseTypes.map(lt => <option key={lt.value} value={lt.value}>{lt.label}</option>)}
                      </select></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">{L.leaseStart}</label><input type="date" value={tenantForm.lease_start || ""} onChange={(e) => setTenantForm({ ...tenantForm, lease_start: e.target.value || null })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">{L.leaseEnd}</label><input type="date" value={tenantForm.lease_end || ""} onChange={(e) => setTenantForm({ ...tenantForm, lease_end: e.target.value || null })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                  </div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">{L.rent}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">{L.rent} ({tenantFormConfig.currencySymbol})</label><input type="number" value={tenantForm.rent_amount || ""} onChange={(e) => setTenantForm({ ...tenantForm, rent_amount: +e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">{L.charges} ({tenantFormConfig.currencySymbol})</label><input type="number" value={tenantForm.charges_amount || ""} onChange={(e) => setTenantForm({ ...tenantForm, charges_amount: +e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">{L.deposit} ({tenantFormConfig.currencySymbol})</label><input type="number" value={tenantForm.deposit_amount || ""} onChange={(e) => setTenantForm({ ...tenantForm, deposit_amount: +e.target.value })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">{L.housingBenefit} ({tenantFormConfig.currencySymbol})</label><input type="number" value={tenantForm.caf_apl_amount || ""} onChange={(e) => setTenantForm({ ...tenantForm, caf_apl_amount: +e.target.value })} placeholder="0" className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">📅 {t("page.rental.payment_day_label")}</label><input type="number" min={1} max={28} value={tenantForm.payment_day || 1} onChange={(e) => setTenantForm({ ...tenantForm, payment_day: +e.target.value })} placeholder="1" className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                  </div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">{L.guarantor}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">{L.guarantor}</label><input value={tenantForm.guarantor_name || ""} onChange={(e) => setTenantForm({ ...tenantForm, guarantor_name: e.target.value || null })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">{L.guarantorPhone}</label><input type="tel" value={tenantForm.guarantor_phone || ""} onChange={(e) => setTenantForm({ ...tenantForm, guarantor_phone: e.target.value || null })} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" /></div>
                  </div>
                  <textarea value={tenantForm.notes} onChange={(e) => setTenantForm({ ...tenantForm, notes: e.target.value })} placeholder={L.notes} rows={2} className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                  <button onClick={handleSaveTenant} className="bg-gradient-gold text-accent-foreground text-sm font-semibold px-6 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity">
                    {editingTenantId ? L.save : L.addTenant}
                  </button>
                </div>
              </div>
            )}

            {filteredTenants.length === 0 && !showTenantForm && (
              <div className="text-center py-16">
                <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                 <h2 className="text-lg font-semibold text-foreground mb-1">{leaseFilter === "terminated" ? L.noActiveLease : L.noTenant}</h2>
                 <p className="text-sm text-muted-foreground">{leaseFilter === "terminated" ? L.allLeasesActive : L.addFirstTenant}</p>
              </div>
            )}

            <div className="space-y-3">
              {filteredTenants.map((t) => {
                const prop = getPropertyForTenant(t);
                const active = isLeaseActive(t);
                return (
                  <div key={t.id} className={`bg-card rounded-xl p-4 sm:p-5 shadow-card border border-border/50 hover:shadow-card-hover transition-all group ${!active ? "opacity-70" : ""}`}>
                    <div className="card-row">
                      {/* Col 1: Avatar */}
                      <button onClick={() => { setSelectedTenant(t); setTenantTab("info"); }} className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${active ? "bg-gradient-gold" : "bg-muted"}`}>
                        <span className={`text-sm font-bold ${active ? "text-accent-foreground" : "text-muted-foreground"}`}>{t.name[0]?.toUpperCase()}</span>
                      </button>
                      {/* Col 2: Info */}
                      <button onClick={() => { setSelectedTenant(t); setTenantTab("info"); }} className="text-left min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground text-sm">{t.name}</span>
                          <div className="badge-row">
                            <span className={active ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}>
                              {active ? L.active : L.terminated}
                            </span>
                            {t.tenant_user_id ? (
                              <span className="bg-success/15 text-success flex items-center gap-0.5"><CheckCircle className="h-2.5 w-2.5" />{L.connected}</span>
                            ) : t.email ? (
                              <button onClick={(e) => { e.stopPropagation(); handleInviteTenant(t); }} disabled={invitingTenantId === t.id}
                                className="bg-accent/10 text-accent flex items-center gap-0.5 hover:bg-accent/20 disabled:opacity-50 cursor-pointer">
                                <Link2 className="h-2.5 w-2.5" />{invitingTenantId === t.id ? L.sending : L.invite}
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                          {prop && <span className="flex items-center gap-1"><Home className="h-3 w-3" />{prop.label}</span>}
                          {t.rent_amount > 0 && <span className="whitespace-nowrap">{fmt(t.rent_amount)}{L.perMonth}</span>}
                          <span className="whitespace-nowrap">{t.lease_start || "—"} → {t.lease_end || "—"}</span>
                        </div>
                      </button>
                      {/* Col 3: Actions */}
                      <div className="flex items-center gap-2">
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                        <button onClick={() => deleteTenant(t.id)} className="text-muted-foreground/40 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
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




        {/* ─── Payments Tab ─── */}
        {activeTab === "payments" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
               <h2 className="font-semibold text-foreground">{L.rentTracking}</h2>
               <button onClick={generateMonthlyRentCalls} className="flex items-center gap-2 bg-gradient-gold text-accent-foreground text-sm font-semibold px-4 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity min-h-[44px] w-full sm:w-auto justify-center sm:justify-start">
                 <Plus className="h-4 w-4" />{L.monthCalls}
               </button>
            </div>

            {/* KPI summary */}
            {(() => {
              const unpaidCalls = filteredPayments.filter(p => !p.paid);
              const paidCalls = filteredPayments.filter(p => p.paid);
              const unpaidTotal = unpaidCalls.reduce((s, p) => s + p.total_amount, 0);
              const paidTotal = paidCalls.reduce((s, p) => s + p.total_amount, 0);
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-card rounded-xl border border-border/50 p-4">
                    <p className="text-xs text-muted-foreground">{L.calls}</p>
                    <p className="text-xl font-bold text-foreground">{filteredPayments.length}</p>
                  </div>
                  <div className="bg-card rounded-xl border border-destructive/20 p-4">
                    <p className="text-xs text-destructive">{t("page.rental.unpaid")}</p>
                    <p className="text-xl font-bold text-destructive">{unpaidCalls.length}</p>
                    <p className="text-xs text-muted-foreground">{fmt(unpaidTotal)}</p>
                  </div>
                  <div className="bg-card rounded-xl border border-success/20 p-4">
                    <p className="text-xs text-success">{L.paid}</p>
                    <p className="text-xl font-bold text-success">{paidCalls.length}</p>
                    <p className="text-xs text-muted-foreground">{fmt(paidTotal)}</p>
                  </div>
                  <div className="bg-card rounded-xl border border-border/50 p-4">
                    <p className="text-xs text-muted-foreground">{L.properties}</p>
                    <p className="text-xl font-bold text-foreground">{new Set(filteredPayments.map(p => p.property_id).filter(Boolean)).size}</p>
                  </div>
                </div>
              );
            })()}

            {/* Property filter */}
            <div className="flex items-center gap-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select value={paymentPropertyFilter} onChange={e => setPaymentPropertyFilter(e.target.value)}
                className="bg-background border border-border rounded-lg px-3 py-2 text-sm">
                <option value="">{L.allProperties}</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
              <span className="text-xs text-muted-foreground">{filteredPayments.length} {L.calls}</span>
            </div>

            {filteredPayments.length === 0 ? (
              <div className="bg-card rounded-xl shadow-card border border-border/50 p-12 text-center">
                <Euro className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground text-sm">{L.noRentCall}</p>
              </div>
            ) : (
              /* Group payments by property, unpaid properties first */
              (() => {
                // Group by property
                const byProperty: Record<string, typeof filteredPayments> = {};
                filteredPayments.forEach(p => {
                  const key = p.property_id || "no-property";
                  if (!byProperty[key]) byProperty[key] = [];
                  byProperty[key].push(p);
                });

                // Sort: properties with unpaid first
                const sortedEntries = Object.entries(byProperty).sort(([, a], [, b]) => {
                  const aUnpaid = a.some(p => !p.paid);
                  const bUnpaid = b.some(p => !p.paid);
                  if (aUnpaid && !bUnpaid) return -1;
                  if (!aUnpaid && bUnpaid) return 1;
                  return 0;
                });

                return (
                  <div className="space-y-6">
                    {sortedEntries.map(([propId, propPayments]) => {
                      const prop = properties.find(p => p.id === propId);
                      const unpaid = propPayments.filter(p => !p.paid).sort((a, b) => a.month.localeCompare(b.month));
                      const paid = propPayments.filter(p => p.paid).sort((a, b) => b.month.localeCompare(a.month));
                      const propCountry = prop?.country?.toUpperCase() || "";
                      const flag = getFlag(propCountry);

                      return (
                        <div key={propId} className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
                          {/* Property header */}
                          <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/30">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-base">{flag}</span>
                              <h3 className="text-sm font-semibold text-foreground truncate">{prop?.label || t("page.rental.no_property")}</h3>
                              {prop?.city && <span className="text-xs text-muted-foreground hidden sm:inline">· {prop.city}</span>}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {unpaid.length > 0 && (
                                <span className="text-xs font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                                  {unpaid.length} {t("page.rental.unpaid")}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">{propPayments.length} {L.calls}</span>
                            </div>
                          </div>

                          {/* Unpaid section */}
                          {unpaid.length > 0 && (
                            <div>
                              <div className="px-4 py-2 bg-destructive/5 border-b border-destructive/10">
                                <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                                  <AlertTriangle className="h-3 w-3" />
                                  {t("page.rental.unpaid")} ({fmt(unpaid.reduce((s, p) => s + p.total_amount, 0))})
                                </p>
                              </div>
                              <div className="divide-y divide-border/30">
                                {unpaid.map(p => {
                                  const tenant = tenants.find(t => t.id === p.tenant_id);
                                  return (
                                    <div key={p.id} id={`payment-${p.id}`} className="flex flex-col gap-2 px-4 py-3 hover:bg-muted/20 transition-all">
                                      <div className="flex items-center gap-3">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-foreground">{tenant?.name || "—"}</p>
                                          <p className="text-xs text-muted-foreground">{p.month} · {fmt(p.total_amount)}</p>
                                        </div>
                                        <button
                                          onClick={() => handleNotifyRentCall(p)}
                                          disabled={notifyingRentId === p.id}
                                          className="inline-flex items-center gap-1 h-8 text-xs px-2.5 rounded-full font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50 shrink-0">
                                          {notifyingRentId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                        </button>
                                      </div>
                                      <div className="flex flex-wrap gap-2 relative">
                                        <button onClick={() => setPaymentMethodDialog(p.id)} className="inline-flex items-center h-8 text-xs px-4 rounded-full font-medium bg-accent/20 text-accent hover:bg-accent/30 transition-colors min-h-[32px]">
                                          {L.markPaid}
                                        </button>
                                        <button onClick={() => handlePayRent(p)} disabled={payingRentId === p.id}
                                          className="inline-flex items-center gap-1.5 h-8 text-xs px-4 rounded-full font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 min-h-[32px]">
                                          {payingRentId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CreditCard className="h-3 w-3" />}
                                          {L.online}
                                        </button>
                                        {/* Payment method dialog */}
                                        {paymentMethodDialog === p.id && (
                                          <div className="absolute left-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg p-3 z-50 w-56">
                                            <p className="text-xs font-semibold text-foreground mb-2">{t("page.rental.payment_method")}</p>
                                            {[
                                              { id: "online", label: t("page.rental.payment_method_online"), icon: CreditCard },
                                              { id: "bank_transfer", label: t("page.rental.payment_method_transfer"), icon: Wallet },
                                              { id: "cash", label: t("page.rental.payment_method_cash"), icon: Euro },
                                            ].map(m => (
                                              <button key={m.id} onClick={(e) => { e.stopPropagation(); togglePayment(p.id, m.id); setPaymentMethodDialog(null); }}
                                                className="flex items-center gap-2 w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-muted transition-colors min-h-[36px]">
                                                <m.icon className="h-3.5 w-3.5 text-muted-foreground" /> {m.label}
                                              </button>
                                            ))}
                                            <button onClick={() => setPaymentMethodDialog(null)} className="mt-1 text-xs text-muted-foreground hover:text-foreground w-full text-center py-1">{t("page.rental.cancel")}</button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Paid section */}
                          {paid.length > 0 && (
                            <div>
                              {unpaid.length > 0 && (
                                <div className="px-4 py-2 bg-success/5 border-b border-success/10 border-t border-border/20">
                                  <p className="text-xs font-semibold text-success flex items-center gap-1.5">
                                    <CheckCircle className="h-3 w-3" />
                                    {L.paid} ({fmt(paid.reduce((s, p) => s + p.total_amount, 0))})
                                  </p>
                                </div>
                              )}
                              <div className="divide-y divide-border/30">
                                {paid.map(p => {
                                  const tenant = tenants.find(t => t.id === p.tenant_id);
                                  return (
                                    <div key={p.id} id={`payment-${p.id}`} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 py-3 hover:bg-muted/20 transition-all">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground">{tenant?.name || "—"}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {p.month} · {fmt(p.total_amount)}
                                          {p.payment_method === "online" ? ` · ${L.online}` : p.payment_method === "bank_transfer" ? ` · ${L.transfer}` : p.payment_method === "cash" ? ` · ${L.cash}` : ""}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="inline-flex items-center h-6 text-xs px-2.5 rounded-full font-medium bg-success/10 text-success">✓ {L.paid}</span>
                                        <button onClick={() => togglePayment(p.id)} className="text-muted-foreground hover:text-foreground" title={t("page.rental.unpaid")}>
                                          <X className="h-3.5 w-3.5" />
                                        </button>
                                        {!p.receipt_validated && <button onClick={() => validateReceipt(p.id)} className="text-xs text-accent hover:underline">{t("page.rental.validate")}</button>}
                                        {p.receipt_validated && <span className="text-xs text-success flex items-center gap-1"><CheckCircle className="h-3 w-3" /></span>}
                                        <button onClick={() => generateReceiptForPayment(p)} className="text-muted-foreground hover:text-foreground"><Download className="h-3.5 w-3.5" /></button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default RentalManagement;
