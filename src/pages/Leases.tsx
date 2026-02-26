import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DocumentBuilder from "@/components/documents/DocumentBuilder";
import { Home, FileText, ChevronRight, Users, Calendar, Euro, ClipboardCheck, MapPin } from "lucide-react";
import { getTemplatesByCategory } from "@/lib/templates/registry";
import type { DocumentTemplate } from "@/lib/templates/types";
import { useRentalData, type Tenant } from "@/hooks/useRentalData";

type LeaseFilter = "all" | "active" | "terminated";

const iconMap: Record<string, typeof Home> = {
  "lease": Home,
  "rent-receipt": FileText,
  "inventory": ClipboardCheck,
  "rent-revision": Euro,
  "charges-regularization": Euro,
  "unpaid-notice": FileText,
};

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

const Leases = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [filter, setFilter] = useState<LeaseFilter>("all");
  const [activeView, setActiveView] = useState<"leases" | "templates">("leases");
  const rentalTemplates = getTemplatesByCategory("rental", "FR");
  const { properties, tenants, loading } = useRentalData();

  const today = new Date().toISOString().split("T")[0];
  const isActive = (t: Tenant) => !t.lease_end || t.lease_end >= today;

  const filtered = tenants.filter(t => {
    if (!t.property_id) return false; // only show tenants with a property (= actual leases)
    if (filter === "active") return isActive(t);
    if (filter === "terminated") return !isActive(t);
    return true;
  });

  const activeCount = tenants.filter(t => t.property_id && isActive(t)).length;
  const terminatedCount = tenants.filter(t => t.property_id && !isActive(t)).length;

  if (selectedTemplate) {
    return (
      <DocumentBuilder
        template={selectedTemplate}
        onBack={() => setSelectedTemplate(null)}
        onGenerated={() => setSelectedTemplate(null)}
      />
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Baux & Locations</h1>
          <p className="text-muted-foreground text-sm mt-1">Vue d'ensemble de toutes vos locations, actives et résiliées.</p>
        </div>

        {/* Main toggle */}
        <div className="flex gap-1 mb-6 bg-muted/50 rounded-lg p-1">
          <button onClick={() => setActiveView("leases")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${activeView === "leases" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <Users className="h-4 w-4" /> Locations ({tenants.filter(t => t.property_id).length})
          </button>
          <button onClick={() => setActiveView("templates")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${activeView === "templates" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <FileText className="h-4 w-4" /> Modèles de documents
          </button>
        </div>

        {activeView === "leases" && (
          <div>
            {/* Filter bar */}
            <div className="flex items-center gap-3 mb-4">
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

            {/* KPI summary */}
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

            {/* Lease list */}
            {loading ? (
              <div className="text-center py-16 text-muted-foreground">Chargement…</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-foreground mb-1">
                  {filter === "terminated" ? "Aucun bail résilié" : filter === "active" ? "Aucun bail actif" : "Aucune location"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {filter === "terminated" ? "Tous vos baux sont actifs." : "Ajoutez un locataire avec un bien dans la gestion locative."}
                </p>
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

        {activeView === "templates" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rentalTemplates.map((t) => {
              const Icon = Object.entries(iconMap).find(([k]) => t.docType.includes(k))?.[1] || FileText;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t)}
                  className="flex items-start gap-4 bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover transition-all text-left group"
                >
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
        )}
      </div>
    </DashboardLayout>
  );
};

export default Leases;
