import { useState, useEffect, useCallback } from "react";
import FeatureGate from "@/components/subscription/FeatureGate";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DocumentBuilder from "@/components/documents/DocumentBuilder";
import { Home, FileText, ChevronRight, Users, Calendar, Euro, MapPin, Plus, Download, Building, ExternalLink, CheckCircle, XCircle, Search, ClipboardCheck, AlertTriangle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
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
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/country-config";
import { generateFromTemplate, downloadPDF, pdfToDataUri } from "@/lib/pdf-generator";

type LeaseFilter = "all" | "active" | "terminated";
type ActiveView = "leases" | "create" | "diagnostics";

const DIAGNOSTIC_LINK_KEYS = [
  { name: "Qalimo", url: "https://www.qalimo.fr", descKey: "page.leases.diag_qalimo" },
  { name: "Diagamter", url: "https://www.diagamter.com", descKey: "page.leases.diag_diagamter" },
  { name: "Allodiagnostic", url: "https://www.allodiagnostic.com", descKey: "page.leases.diag_allodiag" },
  { name: "ANIL", url: "https://www.anil.org", descKey: "page.leases.diag_anil" },
];

const MANDATORY_DIAG_KEYS = [
  "page.leases.diag_dpe",
  "page.leases.diag_crep",
  "page.leases.diag_gas",
  "page.leases.diag_elec",
  "page.leases.diag_erp",
  "page.leases.diag_noise",
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
  const { user, orgId, userCountry } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();

  const fmt = (n: number) => formatCurrency(n, userCountry);

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
    if (!selectedTenantId) { toast({ title: t("page.leases.select_tenant"), variant: "destructive" }); return; }
    const tenant = tenants.find(t => t.id === selectedTenantId);
    if (!tenant || !tenant.property_id) { toast({ title: t("page.leases.add_tenant_hint"), variant: "destructive" }); return; }
    const prop = properties.find(p => p.id === tenant.property_id);
    if (!prop) return;

    setGenerating(true);
    try {
      const leaseTemplateMap: Record<string, DocumentTemplate> = {
        empty: frLeaseEmpty, furnished: frLeaseFurnished, commercial: frLeaseCommercial,
      };
      const template = leaseTemplateMap[selectedLeaseType];
      if (!template) return;

      const ownerData = fillFromOwner();
      let landlordName = ownerData?.landlordName || user?.user_metadata?.name || t("page.leases.landlord_default");
      let landlordAddress = ownerData?.landlordAddress || "";
      let landlordEmail = ownerData?.landlordEmail || user?.email || "";
      let landlordPhone = ownerData?.landlordPhone || "";

      if (!ownerData) {
        try {
          const { data: profile } = await supabase.from("profiles").select("name").eq("id", user!.id).single();
          if (profile?.name) landlordName = profile.name;
        } catch { /* default */ }
      }

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
        hotWater: "individuel", annexes: hasEntryInventory ? t("page.leases.entry_inventory_done") : "", equipments: "",
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
      const leaseLabel = selectedLeaseType === "furnished" ? t("page.leases.furnished_lease") : selectedLeaseType === "commercial" ? t("page.leases.commercial_lease") : t("page.leases.empty_lease");
      const title = `${leaseLabel} — ${tenant.name}`;

      if (orgId) {
        await supabase.from("documents").insert({
          org_id: orgId, user_id: user!.id, title, doc_type: template.docType,
          template_id: template.id, template_version: template.version,
          data_json: leaseData as any, status: "draft", country: "FR",
        } as any);
      }
      const pdfFileName = `${title.replace(/\s/g, "_")}.pdf`;
      downloadPDF(doc, pdfFileName);
      toast({ title: t("page.leases.generated") + " !", description: `${leaseLabel} — ${tenant.name}` });

      // Send lease email to tenant with attached PDF
      const pdfDataUri = pdfToDataUri(doc);
      const pdfBase64 = pdfDataUri.includes(",") ? pdfDataUri.split(",")[1] : "";
      if (tenant.email && pdfBase64) {
        supabase.functions.invoke("send-email", {
          body: {
            to: tenant.email,
            subject: t("page.leases.email_subject").replace("{type}", leaseLabel),
            html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
              <h2 style="color:#1a1a1a;">${t("page.leases.email_title")}</h2>
              <p style="color:#555;">${t("page.leases.email_body")}</p>
              <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0;">
                <p style="font-weight:600;color:#1a1a1a;">${title}</p>
                <p style="color:#888;font-size:13px;">${t("page.leases.email_type")} : ${leaseLabel}</p>
              </div>
              <p style="color:#888;font-size:13px;">${t("page.leases.email_footer")}</p>
            </div>`,
            attachments: [{
              content: pdfBase64,
              filename: pdfFileName,
              type: "application/pdf",
            }],
          },
        }).catch(() => {});
      }

      await loadSavedLeases();
      setActiveView("leases");
    } catch (err) {
      console.error(err);
      toast({ title: t("page.common.error"), variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <DashboardLayout>
      <FeatureGate feature="legal_documents" featureLabel={t("page.leases.title")}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">{t("page.leases.title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("page.leases.subtitle")}</p>
        </div>

        {/* Main toggle */}
        <div className="flex gap-1 mb-6 bg-muted/50 rounded-lg p-1">
          {([
            { key: "leases" as const, icon: Users, label: `${t("page.leases.leases_tab")} (${tenants.filter(t => t.property_id).length})` },
            { key: "create" as const, icon: Plus, label: t("page.leases.create_tab") },
            { key: "diagnostics" as const, icon: ClipboardCheck, label: t("page.leases.diagnostics_tab") },
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
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t("page.leases.search_tenant")} className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-lg focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none" />
              </div>
              <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
                {([
                  { key: "all" as const, label: t("page.leases.all"), count: tenants.filter(t => t.property_id).length },
                  { key: "active" as const, label: t("page.leases.active"), count: activeCount },
                  { key: "terminated" as const, label: t("page.leases.terminated"), count: terminatedCount },
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
              {[
                { label: t("page.leases.active_leases"), value: activeCount, path: "/dashboard/rental?tab=tenants" },
                { label: t("page.leases.terminated_leases"), value: terminatedCount, path: "/dashboard/rental?tab=tenants" },
                { label: t("page.leases.active_revenue"), value: fmt(tenants.filter(t => t.property_id && isActive(t)).reduce((s, t) => s + t.rent_amount + t.charges_amount, 0)), path: "/dashboard/finances" },
                { label: t("page.leases.rented_props"), value: `${new Set(tenants.filter(t => t.property_id && isActive(t)).map(t => t.property_id)).size} / ${properties.length}`, path: "/dashboard/rental?tab=properties" },
              ].map(kpi => (
                <Link key={kpi.label} to={kpi.path} className="bg-card rounded-xl p-4 border border-border/50 hover:shadow-card-hover transition-all group">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                </Link>
              ))}
            </div>

            {/* Saved leases */}
            {savedLeases.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-foreground mb-3">📄 {t("page.leases.generated")}</h2>
                <div className="space-y-2">
                  {savedLeases.slice(0, 5).map(doc => {
                    const handleDownloadSaved = () => {
                      const templateMap: Record<string, DocumentTemplate> = {
                        "lease-empty": frLeaseEmpty,
                        "lease-furnished": frLeaseFurnished,
                        "lease-commercial": frLeaseCommercial,
                      };
                      const tpl = doc.template_id ? (templateMap[doc.doc_type] || Object.values(templateMap).find(t => t.id === doc.template_id)) : templateMap[doc.doc_type];
                      if (tpl && doc.data_json) {
                        const pdf = generateFromTemplate(tpl, doc.data_json as Record<string, unknown>);
                        downloadPDF(pdf, `${doc.title?.replace(/\s/g, "_") || "bail"}.pdf`);
                      }
                    };
                    return (
                      <div key={doc.id} className="flex items-center justify-between bg-card rounded-lg p-3 border border-border/50 text-sm">
                        <div>
                          <span className="font-medium text-foreground">{doc.title}</span>
                          <span className="text-muted-foreground ml-2 text-xs">{new Date(doc.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={handleDownloadSaved} className="text-muted-foreground hover:text-foreground transition-colors p-1" title={t("page.leases.download_tooltip")}>
                            <Download className="h-4 w-4" />
                          </button>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${doc.status === "draft" ? "bg-accent/20 text-accent" : "bg-green-500/20 text-green-700"}`}>
                             {doc.status === "draft" ? t("page.leases.ready") : t("page.leases.signed")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Lease list */}
            {loading ? (
              <div className="text-center py-16 text-muted-foreground">{t("page.common.loading")}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-foreground mb-1">
                  {filter === "terminated" ? t("page.leases.no_terminated") : filter === "active" ? t("page.leases.no_active") : t("page.leases.no_lease")}
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  {filter === "terminated" ? t("page.leases.all_active") : t("page.leases.add_tenant_hint")}
                </p>
                <button onClick={() => setActiveView("create")}
                  className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                  <Plus className="h-4 w-4" /> {t("page.leases.create")}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(tenant => {
                  const prop = properties.find(p => p.id === tenant.property_id);
                  const active = isActive(tenant);
                  return (
                    <Link to="/dashboard/rental?tab=tenants" key={tenant.id} className={`block bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover transition-all ${!active ? "opacity-70" : ""}`}>
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${active ? "bg-gradient-gold" : "bg-muted"}`}>
                          <span className={`text-sm font-bold ${active ? "text-accent-foreground" : "text-muted-foreground"}`}>{tenant.name[0]?.toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground text-sm">{tenant.name}</span>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${active ? "bg-green-500/20 text-green-700" : "bg-destructive/20 text-destructive"}`}>
                              {active ? t("page.common.active") : t("page.leases.terminated")}
                            </span>
                            <span className="text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                              {tenant.lease_type === "furnished" ? t("page.leases.furnished") : tenant.lease_type === "commercial" ? t("page.leases.commercial") : t("page.leases.empty")}
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
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{tenant.lease_start || "—"} → {tenant.lease_end || t("page.leases.in_progress")}</span>
                            <span className="flex items-center gap-1"><Euro className="h-3 w-3" />{fmt(tenant.rent_amount)} + {fmt(tenant.charges_amount)}{t("page.leases.per_month")}</span>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/30 shrink-0 mt-3" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── CREATE LEASE ─── */}
        {activeView === "create" && (
          <div className="max-w-xl mx-auto">
            <div className="bg-card rounded-xl p-6 border border-border/50 shadow-card">
              <h2 className="text-lg font-bold text-foreground mb-1">{t("page.leases.create")}</h2>
              <p className="text-sm text-muted-foreground mb-6">{t("page.leases.select_tenant")}</p>

              <label className="text-sm font-medium text-foreground mb-1 block">1. {t("page.leases.select_tenant_label")}</label>
              <select value={selectedTenantId} onChange={e => setSelectedTenantId(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm mb-4 focus:ring-2 focus:ring-accent/30 outline-none">
                <option value="">{t("page.common.select")}</option>
                {tenants.filter(t => t.property_id).map(tenant => {
                  const prop = properties.find(p => p.id === tenant.property_id);
                  return <option key={tenant.id} value={tenant.id}>{tenant.name} — {prop?.label || "—"}</option>;
                })}
              </select>

              {selectedTenantId && (() => {
                const tenant = tenants.find(x => x.id === selectedTenantId);
                const p = tenant ? properties.find(x => x.id === tenant.property_id) : null;
                if (!tenant || !p) return null;
                return (
                   <div className="bg-muted/50 rounded-lg p-4 mb-4 text-xs space-y-1">
                    <p className="font-medium text-foreground text-sm mb-2">✅ {t("page.leases.prefilled_data")} :</p>
                    <p><span className="text-muted-foreground">{t("page.leases.select_tenant_label")} :</span> {tenant.name} — {tenant.email || "—"}</p>
                    <p><span className="text-muted-foreground">{t("page.dashboard.properties")} :</span> {p.label} — {p.address}, {p.postal_code} {p.city}</p>
                    <p><span className="text-muted-foreground">{t("page.leases.rent_label")} :</span> {fmt(tenant.rent_amount)} + {fmt(tenant.charges_amount)}</p>
                    <p><span className="text-muted-foreground">{t("page.leases.deposit_label")} :</span> {fmt(tenant.deposit_amount)}</p>
                    <p><span className="text-muted-foreground">{t("ob.lease_start")} :</span> {tenant.lease_start || "—"}</p>
                  </div>
                );
              })()}

              <label className="text-sm font-medium text-foreground mb-1 block">2. {t("page.leases.lease_type")}</label>
              <div className="grid grid-cols-3 gap-2 mb-6">
                {([
                  { key: "empty", label: t("page.leases.empty"), desc: t("page.leases.duration_empty") },
                  { key: "furnished", label: t("page.leases.furnished"), desc: t("page.leases.duration_furnished") },
                  { key: "commercial", label: t("page.leases.commercial"), desc: t("page.leases.duration_commercial") },
                ]).map(lt => (
                  <button key={lt.key} onClick={() => setSelectedLeaseType(lt.key)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-sm transition-all ${selectedLeaseType === lt.key ? "border-accent bg-accent/10 text-foreground" : "border-border text-muted-foreground hover:border-accent/50"}`}>
                    <span className="font-medium">{lt.label}</span>
                    <span className="text-[10px]">{lt.desc}</span>
                  </button>
                ))}
              </div>

              <button onClick={handleGenerateLease} disabled={generating || !selectedTenantId}
                className="w-full flex items-center justify-center gap-2 bg-accent text-accent-foreground py-3 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                {generating ? (
                  <><span className="animate-spin">⏳</span> {t("page.leases.generating")}</>
                ) : (
                  <><Download className="h-4 w-4" /> {t("page.leases.generate_pdf")}</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ─── DIAGNOSTICS ─── */}
        {activeView === "diagnostics" && (
          <div className="space-y-6">
            <div className="bg-card rounded-xl p-6 border border-border/50 shadow-card">
              <h2 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-accent" /> {t("page.leases.mandatory_diag")}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">{t("page.leases.diagnostics_tab")}</p>
               <div className="space-y-2">
                {MANDATORY_DIAG_KEYS.map((key, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <CheckCircle className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                    <span className="text-foreground">{t(key)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-xl p-6 border border-border/50 shadow-card">
              <h2 className="text-lg font-bold text-foreground mb-4">{t("page.leases.tools_partners")}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DIAGNOSTIC_LINK_KEYS.map(link => (
                  <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-start gap-3 p-4 rounded-lg border border-border/50 hover:border-accent/50 hover:shadow-sm transition-all group">
                    <ExternalLink className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-foreground text-sm group-hover:text-accent transition-colors">{link.name}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{t(link.descKey)}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <div className="bg-accent/5 border border-accent/20 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-2">{t("page.leases.compliance_title")}</h3>
               <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                <li>{t("page.leases.compliance_1")}</li>
                <li>{t("page.leases.compliance_2")}</li>
                <li>{t("page.leases.compliance_3")}</li>
                <li>{t("page.leases.compliance_4")}</li>
                <li>{t("page.leases.compliance_5")}</li>
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
