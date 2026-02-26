import { useState, useEffect, useCallback } from "react";
import FeatureGate from "@/components/subscription/FeatureGate";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DocumentBuilder from "@/components/documents/DocumentBuilder";
import { Home, FileText, ChevronRight, Users, Calendar, Euro, MapPin, Plus, Download, Building, ExternalLink, CheckCircle, XCircle, Search, ClipboardCheck, AlertTriangle } from "lucide-react";
import { getTemplatesByCategory } from "@/lib/templates/registry";
import { frLeaseEmpty } from "@/lib/templates/fr/lease-empty";
import { frLeaseFurnished } from "@/lib/templates/fr/lease-furnished";
import { frLeaseCommercial } from "@/lib/templates/fr/lease-commercial";
import type { DocumentTemplate } from "@/lib/templates/types";
import { useRentalData, type Tenant, type Property } from "@/hooks/useRentalData";
import { useAutoFill } from "@/hooks/useAutoFill";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { generateFromTemplate, downloadPDF } from "@/lib/pdf-generator";

type LeaseFilter = "all" | "active" | "terminated";
type ActiveView = "leases" | "create" | "diagnostics";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

const DIAGNOSTIC_LINKS = [
  { name: "Qalimo", url: "https://www.qalimo.fr", desc: "Vérification conformité bail, diagnostics obligatoires, dossier locataire" },
  { name: "Diagamter", url: "https://www.diagamter.com", desc: "DPE, amiante, plomb, gaz, électricité — réseau national" },
  { name: "Allodiagnostic", url: "https://www.allodiagnostic.com", desc: "Diagnostics immobiliers en ligne, devis instantané" },
  { name: "ANIL", url: "https://www.anil.org", desc: "Information juridique gratuite sur le logement (loyers, baux, etc.)" },
];

const MANDATORY_DIAGNOSTICS = [
  "DPE (Diagnostic de Performance Énergétique)",
  "CREP (Constat de Risque d'Exposition au Plomb) — logements avant 1949",
  "État de l'installation intérieure de gaz (+ de 15 ans)",
  "État de l'installation intérieure d'électricité (+ de 15 ans)",
  "État des Risques et Pollutions (ERP)",
  "Diagnostic bruit — zones d'exposition au bruit des aérodromes",
];

const Leases = () => {
  const [filter, setFilter] = useState<LeaseFilter>("all");
  const [activeView, setActiveView] = useState<ActiveView>("leases");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeaseType, setSelectedLeaseType] = useState<string>("empty");
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const { properties, tenants, loading } = useRentalData();
  const { fillFromOwner, getInventoryForProperty } = useAutoFill(properties, tenants);
  const { user, orgId } = useAuth();
  const { toast } = useToast();

  // Saved leases from documents table
  const [savedLeases, setSavedLeases] = useState<any[]>([]);
  const loadSavedLeases = useCallback(async () => {
    if (!orgId) return;
    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("org_id", orgId)
      .in("doc_type", ["lease-empty", "lease-furnished", "lease-commercial"])
      .order("created_at", { ascending: false });
    setSavedLeases(data || []);
  }, [orgId]);

  useEffect(() => { loadSavedLeases(); }, [loadSavedLeases]);

  const today = new Date().toISOString().split("T")[0];
  const isActive = (t: Tenant) => !t.lease_end || t.lease_end >= today;

  const filtered = tenants.filter(t => {
    if (!t.property_id) return false;
    if (filter === "active") return isActive(t);
    if (filter === "terminated") return !isActive(t);
    return true;
  }).filter(t => !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const activeCount = tenants.filter(t => t.property_id && isActive(t)).length;
  const terminatedCount = tenants.filter(t => t.property_id && !isActive(t)).length;

  /* ─── Guided lease creation ─── */
  const handleGenerateLease = async () => {
    if (!selectedTenantId) { toast({ title: "Sélectionnez un locataire", variant: "destructive" }); return; }
    const tenant = tenants.find(t => t.id === selectedTenantId);
    if (!tenant || !tenant.property_id) { toast({ title: "Le locataire doit être associé à un bien", variant: "destructive" }); return; }
    const prop = properties.find(p => p.id === tenant.property_id);
    if (!prop) return;

    setGenerating(true);
    try {
      const leaseTemplateMap: Record<string, DocumentTemplate> = {
        empty: frLeaseEmpty, furnished: frLeaseFurnished, commercial: frLeaseCommercial,
      };
      const template = leaseTemplateMap[selectedLeaseType];
      if (!template) return;

      // Auto-fill from owner profile
      const ownerData = fillFromOwner();
      let landlordName = ownerData?.landlordName || user?.user_metadata?.name || "Propriétaire";
      let landlordAddress = ownerData?.landlordAddress || "";
      let landlordEmail = ownerData?.landlordEmail || user?.email || "";
      let landlordPhone = ownerData?.landlordPhone || "";

      // Fallback to profiles table if no owner_profiles
      if (!ownerData) {
        try {
          const { data: profile } = await supabase.from("profiles").select("name").eq("id", user!.id).single();
          if (profile?.name) landlordName = profile.name;
        } catch { /* default */ }
      }

      // Get inventory reports for this property/tenant
      const inventories = getInventoryForProperty(prop.id, tenant.id);
      const hasEntryInventory = inventories.some(i => i.report_type === "entry" && i.status === "completed");

      const heatingMap: Record<string, string> = { "individual-gas": "individuel-gaz", "individual-electric": "individuel-electrique", "collective": "collectif", "heat-pump": "pompe-chaleur", "other": "autre" };
      const propertyTypeMap: Record<string, string> = { apartment: "Appartement", house: "Maison", studio: "Studio", commercial: "Local commercial", parking: "Parking / Garage" };

      const leaseData: Record<string, unknown> = {
        landlordName, landlordAddress: landlordAddress || `${prop.address}, ${prop.postal_code} ${prop.city}`,
        landlordEmail, landlordPhone,
        landlordBankName: ownerData?.landlordBankName || "",
        landlordBankIban: ownerData?.landlordBankIban || "",
        landlordBankBic: ownerData?.landlordBankBic || "",
        tenantName: tenant.name, tenantBirthDate: tenant.birth_date || "", tenantBirthPlace: tenant.birth_place || "", tenantEmail: tenant.email, tenantPhone: tenant.phone,
        tenantNationality: tenant.nationality || "", tenantProfession: tenant.profession || "",
        propertyAddress: `${prop.address}, ${prop.postal_code} ${prop.city}`, propertyType: propertyTypeMap[prop.property_type] || prop.property_type,
        surface: prop.surface, rooms: prop.rooms, floor: prop.floor ?? "", heating: heatingMap[prop.heating] || prop.heating,
        hotWater: "individuel", annexes: hasEntryInventory ? "État des lieux d'entrée réalisé" : "", equipments: "",
        rentAmount: tenant.rent_amount || prop.monthly_rent, chargesAmount: tenant.charges_amount || prop.monthly_charges,
        chargesMode: "provisions", depositAmount: tenant.deposit_amount || prop.deposit_amount, paymentDay: 5, paymentMethod: "virement",
        zoneTendue: "non", dpeLetter: "D", gesLetter: "D",
        startDate: tenant.lease_start || today,
        duration: selectedLeaseType === "furnished" ? "1" : selectedLeaseType === "commercial" ? "9" : "3",
        inventoryEntryDone: hasEntryInventory,
      };

      if (selectedLeaseType === "furnished") {
        leaseData.furnitureList = "Literie avec couette/couverture\nVolets ou rideaux occultants\nPlaques de cuisson\nFour ou micro-ondes\nRéfrigérateur\nVaisselle et ustensiles\nTable et chaises\nÉtagères de rangement\nLuminaires\nMatériel d'entretien ménager";
      }

      const doc = generateFromTemplate(template, leaseData);
      const leaseLabel = selectedLeaseType === "furnished" ? "Bail meublé" : selectedLeaseType === "commercial" ? "Bail commercial" : "Bail d'habitation vide";
      const title = `${leaseLabel} — ${tenant.name}`;

      if (orgId) {
        await supabase.from("documents").insert({
          org_id: orgId, user_id: user!.id, title, doc_type: template.docType,
          template_id: template.id, template_version: template.version,
          data_json: leaseData as any, status: "draft", country: "FR",
        } as any);
      }
      downloadPDF(doc, `${title.replace(/\s/g, "_")}.pdf`);
      toast({ title: "Bail généré !", description: `${leaseLabel} téléchargé pour ${tenant.name}` });
      await loadSavedLeases();
      setActiveView("leases");
    } catch (err) {
      console.error(err);
      toast({ title: "Erreur de génération", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <DashboardLayout>
      <FeatureGate feature="legal_documents" featureLabel="Gestion des baux">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Baux & Locations</h1>
          <p className="text-muted-foreground text-sm mt-1">Créez, gérez et suivez tous vos baux.</p>
        </div>

        {/* Main toggle */}
        <div className="flex gap-1 mb-6 bg-muted/50 rounded-lg p-1">
          {([
            { key: "leases" as const, icon: Users, label: `Baux (${tenants.filter(t => t.property_id).length})` },
            { key: "create" as const, icon: Plus, label: "Créer un bail" },
            { key: "diagnostics" as const, icon: ClipboardCheck, label: "Diagnostics & Conformité" },
          ]).map(v => (
            <button key={v.key} onClick={() => setActiveView(v.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${activeView === v.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <v.icon className="h-4 w-4" /> {v.label}
            </button>
          ))}
        </div>

        {/* ─── LEASE LIST ─── */}
        {activeView === "leases" && (
          <div>
            {/* Search + filters */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un locataire…" className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-lg focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none" />
              </div>
              <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
                {([
                  { key: "all" as const, label: "Tous", count: tenants.filter(t => t.property_id).length },
                  { key: "active" as const, label: "Actifs", count: activeCount },
                  { key: "terminated" as const, label: "Résiliés", count: terminatedCount },
                ]).map(f => (
                  <button key={f.key} onClick={() => setFilter(f.key)}
                    className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${filter === f.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                    {f.label} ({f.count})
                  </button>
                ))}
              </div>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-card rounded-xl p-4 border border-border/50">
                <p className="text-xs text-muted-foreground">Locations actives</p>
                <p className="text-2xl font-bold text-foreground">{activeCount}</p>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border/50">
                <p className="text-xs text-muted-foreground">Baux résiliés</p>
                <p className="text-2xl font-bold text-foreground">{terminatedCount}</p>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border/50">
                <p className="text-xs text-muted-foreground">Revenus actifs/mois</p>
                <p className="text-lg font-bold text-foreground">
                  {fmt(tenants.filter(t => t.property_id && isActive(t)).reduce((s, t) => s + t.rent_amount + t.charges_amount, 0))}
                </p>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border/50">
                <p className="text-xs text-muted-foreground">Biens loués</p>
                <p className="text-2xl font-bold text-foreground">
                  {new Set(tenants.filter(t => t.property_id && isActive(t)).map(t => t.property_id)).size} / {properties.length}
                </p>
              </div>
            </div>

            {/* Saved leases (documents) */}
            {savedLeases.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-foreground mb-3">📄 Baux générés</h2>
                <div className="space-y-2">
                  {savedLeases.slice(0, 5).map(doc => (
                    <div key={doc.id} className="flex items-center justify-between bg-card rounded-lg p-3 border border-border/50 text-sm">
                      <div>
                        <span className="font-medium text-foreground">{doc.title}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{new Date(doc.created_at).toLocaleDateString("fr-FR")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${doc.status === "draft" ? "bg-muted text-muted-foreground" : "bg-green-500/20 text-green-700"}`}>
                          {doc.status === "draft" ? "Brouillon" : "Signé"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lease list */}
            {loading ? (
              <div className="text-center py-16 text-muted-foreground">Chargement…</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-foreground mb-1">
                  {filter === "terminated" ? "Aucun bail résilié" : filter === "active" ? "Aucun bail actif" : "Aucune location"}
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  {filter === "terminated" ? "Tous vos baux sont actifs." : "Ajoutez un locataire avec un bien pour créer un bail."}
                </p>
                <button onClick={() => setActiveView("create")}
                  className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                  <Plus className="h-4 w-4" /> Créer un bail
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(t => {
                  const prop = properties.find(p => p.id === t.property_id);
                  const active = isActive(t);
                  return (
                    <div key={t.id} className={`bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover transition-all ${!active ? "opacity-70" : ""}`}>
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${active ? "bg-gradient-gold" : "bg-muted"}`}>
                          <span className={`text-sm font-bold ${active ? "text-accent-foreground" : "text-muted-foreground"}`}>{t.name[0]?.toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground text-sm">{t.name}</span>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${active ? "bg-green-500/20 text-green-700" : "bg-destructive/20 text-destructive"}`}>
                              {active ? "Actif" : "Résilié"}
                            </span>
                            <span className="text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                              {t.lease_type === "furnished" ? "Meublé" : t.lease_type === "commercial" ? "Commercial" : "Vide"}
                            </span>
                          </div>
                          {prop && (
                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Home className="h-3 w-3" /> {prop.label}
                              <span className="mx-1">·</span>
                              <MapPin className="h-3 w-3" /> {prop.address}, {prop.postal_code} {prop.city}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{t.lease_start || "—"} → {t.lease_end || "En cours"}</span>
                            <span className="flex items-center gap-1"><Euro className="h-3 w-3" />{fmt(t.rent_amount)} + {fmt(t.charges_amount)}/mois</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── CREATE LEASE (guided) ─── */}
        {activeView === "create" && (
          <div className="max-w-xl mx-auto">
            <div className="bg-card rounded-xl p-6 border border-border/50 shadow-card">
              <h2 className="text-lg font-bold text-foreground mb-1">Créer un bail</h2>
              <p className="text-sm text-muted-foreground mb-6">Sélectionnez un locataire et le type de bail. Les informations du bien et du locataire seront pré-remplies automatiquement.</p>

              {/* Step 1: Tenant */}
              <label className="text-sm font-medium text-foreground mb-1 block">1. Locataire</label>
              <select value={selectedTenantId} onChange={e => setSelectedTenantId(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm mb-4 focus:ring-2 focus:ring-accent/30 outline-none">
                <option value="">— Choisir un locataire —</option>
                {tenants.filter(t => t.property_id).map(t => {
                  const prop = properties.find(p => p.id === t.property_id);
                  return <option key={t.id} value={t.id}>{t.name} — {prop?.label || "Sans bien"}</option>;
                })}
              </select>

              {/* Auto-fill preview */}
              {selectedTenantId && (() => {
                const t = tenants.find(x => x.id === selectedTenantId);
                const p = t ? properties.find(x => x.id === t.property_id) : null;
                if (!t || !p) return null;
                return (
                  <div className="bg-muted/50 rounded-lg p-4 mb-4 text-xs space-y-1">
                    <p className="font-medium text-foreground text-sm mb-2">✅ Données pré-remplies :</p>
                    <p><span className="text-muted-foreground">Locataire :</span> {t.name} — {t.email || "pas d'email"}</p>
                    <p><span className="text-muted-foreground">Bien :</span> {p.label} — {p.address}, {p.postal_code} {p.city}</p>
                    <p><span className="text-muted-foreground">Loyer :</span> {fmt(t.rent_amount)} + {fmt(t.charges_amount)} charges</p>
                    <p><span className="text-muted-foreground">Dépôt :</span> {fmt(t.deposit_amount)}</p>
                    <p><span className="text-muted-foreground">Début :</span> {t.lease_start || "Non défini"}</p>
                  </div>
                );
              })()}

              {/* Step 2: Lease type */}
              <label className="text-sm font-medium text-foreground mb-1 block">2. Type de bail</label>
              <div className="grid grid-cols-3 gap-2 mb-6">
                {([
                  { key: "empty", label: "Vide", desc: "3 ans" },
                  { key: "furnished", label: "Meublé", desc: "1 an" },
                  { key: "commercial", label: "Commercial", desc: "3/6/9 ans" },
                ]).map(lt => (
                  <button key={lt.key} onClick={() => setSelectedLeaseType(lt.key)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-sm transition-all ${selectedLeaseType === lt.key ? "border-accent bg-accent/10 text-foreground" : "border-border text-muted-foreground hover:border-accent/50"}`}>
                    <span className="font-medium">{lt.label}</span>
                    <span className="text-[10px]">{lt.desc}</span>
                  </button>
                ))}
              </div>

              {/* Generate */}
              <button onClick={handleGenerateLease} disabled={generating || !selectedTenantId}
                className="w-full flex items-center justify-center gap-2 bg-accent text-accent-foreground py-3 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                {generating ? (
                  <><span className="animate-spin">⏳</span> Génération…</>
                ) : (
                  <><Download className="h-4 w-4" /> Générer le bail PDF</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ─── DIAGNOSTICS & COMPLIANCE ─── */}
        {activeView === "diagnostics" && (
          <div className="space-y-6">
            {/* Mandatory diagnostics checklist */}
            <div className="bg-card rounded-xl p-6 border border-border/50 shadow-card">
              <h2 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-accent" /> Diagnostics obligatoires
              </h2>
              <p className="text-sm text-muted-foreground mb-4">Avant de signer un bail, vérifiez que ces diagnostics sont à jour pour chaque bien loué.</p>
              <div className="space-y-2">
                {MANDATORY_DIAGNOSTICS.map((d, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <CheckCircle className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                    <span className="text-foreground">{d}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* External links */}
            <div className="bg-card rounded-xl p-6 border border-border/50 shadow-card">
              <h2 className="text-lg font-bold text-foreground mb-4">🔗 Outils & Partenaires</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DIAGNOSTIC_LINKS.map(link => (
                  <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-start gap-3 p-4 rounded-lg border border-border/50 hover:border-accent/50 hover:shadow-sm transition-all group">
                    <ExternalLink className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-foreground text-sm group-hover:text-accent transition-colors">{link.name}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{link.desc}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Compliance tips */}
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-2">📋 Conformité du bail — Points clés</h3>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                <li>Le bail doit contenir toutes les mentions obligatoires (loi ALUR)</li>
                <li>Les diagnostics doivent être annexés au bail lors de la signature</li>
                <li>En zone tendue, vérifier l'encadrement des loyers (plafonds préfectoraux)</li>
                <li>Le dépôt de garantie ne peut excéder 1 mois de loyer HC (vide) ou 2 mois (meublé)</li>
                <li>L'état des lieux doit être réalisé de manière contradictoire</li>
              </ul>
            </div>
          </div>
        )}
      </div>
      </FeatureGate>
    </DashboardLayout>
  );
};

export default Leases;
