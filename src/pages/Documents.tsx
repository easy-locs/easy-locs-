import { useState, useEffect } from "react";
import PropertyHubBreadcrumb from "@/components/property/PropertyHubBreadcrumb";
import { motion } from "framer-motion";
import { useCountryFilter } from "@/hooks/useCountryFilter";
import FeatureGate from "@/components/subscription/FeatureGate";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DocumentBuilder from "@/components/documents/DocumentBuilder";
import { FileText, Download, Clock, ChevronRight, Building2, Scale, Home, AlertTriangle } from "lucide-react";
import { getCountryFlag } from "@/lib/global-country-registry";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getActiveTemplates, getAllTemplates } from "@/lib/templates/registry";
import type { DocumentTemplate } from "@/lib/templates/types";
import { generateFromTemplate, downloadPDF } from "@/lib/pdf-generator";
import { useI18n } from "@/lib/i18n";
import { getCountryEntry, getCountryLabelsMap } from "@/lib/global-country-registry";

const categoryIcons: Record<string, typeof FileText> = {
  rental: Home, administrative: FileText, company: Building2, legal: Scale,
};
const CATEGORY_LABEL_KEYS: Record<string, string> = {
  rental: "page.documents.cat_rental",
  administrative: "page.documents.cat_admin",
  company: "page.documents.cat_company",
  legal: "page.documents.cat_legal",
};
const countryLabels: Record<string, string> = getCountryLabelsMap();

interface DocRow {
  id: string;
  title: string;
  doc_type: string;
  template_id: string | null;
  template_version: string | null;
  data_json: Record<string, unknown>;
  pdf_url: string | null;
  created_at: string;
}

const Documents = () => {
  const countryFilter = useCountryFilter();
  const [tab, setTab] = useState<"create" | "history" | "europe">("create");
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { orgId } = useAuth();
  const { t } = useI18n();

  // Country is enforced by CountryGuard — always available
  const activeCountry = countryFilter || "FR";
  const activeLocale = getCountryEntry(activeCountry)?.locale || "en-GB";
  const activeTemplates = getActiveTemplates(activeCountry as any);
  const allTemplates = getAllTemplates();
  const europeTemplates = allTemplates.filter((tpl) => tpl.country !== activeCountry);

  const fetchDocs = async () => {
    if (!orgId) return;
    const { data } = await supabase
      .from("documents")
      .select("id, title, doc_type, template_id, template_version, data_json, pdf_url, created_at, country, routed_to, routing_status, property_id, tenant_id, lease_id")
      .eq("org_id", orgId)
      .eq("country", activeCountry)
      .order("created_at", { ascending: false });
    setDocs((data as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, [orgId, activeCountry]);
  const byCategory = activeTemplates.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {} as Record<string, DocumentTemplate[]>);

  const handleDownload = (d: DocRow) => {
    if (d.template_id) {
      const template = allTemplates.find((t) => t.id === d.template_id);
      if (template) {
        const doc = generateFromTemplate(template, d.data_json, undefined, undefined, { country: template.country });
        downloadPDF(doc, `${d.title.replace(/\s/g, "_")}.pdf`);
      }
    }
  };

  if (selectedTemplate) {
    return (
      <DocumentBuilder
        template={selectedTemplate}
        onBack={() => setSelectedTemplate(null)}
        onGenerated={() => {
          setSelectedTemplate(null);
          setTab("history");
          fetchDocs();
        }}
      />
    );
  }

  return (
    <DashboardLayout>
      <FeatureGate feature="legal_documents" featureLabel={t("page.documents.title")}>
      <PropertyHubBreadcrumb currentPage={t("page.documents.title")} />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <div className="p-1.5 sm:p-2 rounded-xl bg-accent/10 shrink-0"><FileText className="h-4 w-4 sm:h-5 sm:w-5 text-accent" /></div>
              {t("page.documents.title")}
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">{t("page.documents.desc")}</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg text-sm shrink-0 self-start">
            <span className="text-lg">{getCountryFlag(activeCountry)}</span>
            <span className="font-medium text-foreground">{countryLabels[activeCountry] || activeCountry}</span>
          </div>
        </motion.div>

        <div className="flex gap-1 bg-muted rounded-lg p-1 mb-4 sm:mb-8 overflow-x-auto scrollbar-thin">
          {([
            { key: "create" as const, label: t("page.documents.create") },
            { key: "history" as const, label: `${t("page.documents.history")} (${docs.length})` },
            { key: "europe" as const, label: "🌍 International" },
          ]).map((tb) => (
            <button key={tb.key} onClick={() => setTab(tb.key)}
              className={`flex-1 py-2 px-3 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${tab === tb.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {tb.label}
            </button>
          ))}
        </div>

        {tab === "create" && (
          <div className="space-y-8">
            {Object.entries(byCategory).map(([cat, templates]) => {
              const Icon = categoryIcons[cat] || FileText;
              return (
                <div key={cat}>
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    {t(CATEGORY_LABEL_KEYS[cat] || "page.documents.cat_rental")}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {templates.map((t) => (
                      <button key={t.id} onClick={() => setSelectedTemplate(t)}
                        className="doc-template-card flex items-start gap-3 sm:gap-4 bg-card rounded-xl p-3.5 sm:p-5 shadow-card border border-border/50 hover:shadow-card-hover transition-all text-left group">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-gradient-gold transition-colors shrink-0">
                          <Icon className="h-5 w-5 text-muted-foreground group-hover:text-accent-foreground transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground text-sm">{t.label}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
                          <div className="text-xs text-muted-foreground/60 mt-1">v{t.version}</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 mt-1 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-4">
            {/* Document routing legend */}
            <div className="flex items-center gap-3 flex-wrap text-2xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
              <span className="font-medium text-foreground text-xs">Routage :</span>
              {[
                { icon: "🏠", label: "Bien" },
                { icon: "👤", label: "Locataire" },
                { icon: "📝", label: "Bail" },
                { icon: "💰", label: "Comptabilité" },
                { icon: "📊", label: "Dashboard" },
                { icon: "🔓", label: "Portail locataire" },
              ].map(r => (
                <span key={r.label} className="inline-flex items-center gap-0.5">{r.icon} {r.label}</span>
              ))}
            </div>

            {loading ? (
              <div className="text-center py-12 text-muted-foreground text-sm">{t("page.documents.loading")}</div>
            ) : docs.length === 0 ? (
              <div className="bg-card rounded-xl shadow-card border border-border/50 p-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">{t("page.documents.no_doc")}</p>
              </div>
            ) : (
              docs.map((d: any) => {
                const routed: string[] = Array.isArray(d.routed_to) ? d.routed_to : [];
                const routeIcons: Record<string, string> = {
                  property_file: "🏠", tenant_file: "👤", lease_file: "📝",
                  accounting_record: "💰", owner_dashboard: "📊", tenant_portal: "🔓",
                };
                return (
                  <div key={d.id} className="bg-card rounded-xl p-4 shadow-card border border-border/50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{d.title}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <Clock className="h-3 w-3" />
                          {new Date(d.created_at).toLocaleDateString(activeLocale)}
                          <span className="bg-muted px-1.5 py-0.5 rounded text-xs">{d.doc_type}</span>
                          {d.routing_status === "routed" && (
                            <span className="bg-success/10 text-success px-1.5 py-0.5 rounded text-2xs">✓ Routé</span>
                          )}
                        </div>
                        {/* Routing chips */}
                        {routed.length > 0 && (
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            {routed.map(r => (
                              <span key={r} className="inline-flex items-center gap-0.5 text-2xs bg-muted/60 px-1.5 py-0.5 rounded" title={r}>
                                {routeIcons[r] || "📁"} {r.replace(/_/g, " ")}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button onClick={() => handleDownload(d)} className="text-muted-foreground hover:text-foreground transition-colors p-2 shrink-0">
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === "europe" && (
          <div className="space-y-6">
            <div className="flex items-start gap-3 bg-accent/10 border border-accent/30 rounded-lg p-4">
              <span className="text-xl shrink-0 mt-0.5">🌍</span>
              <div>
                <p className="text-sm font-medium text-foreground">{t("page.documents.euro_title")}</p>
                <p className="text-xs text-muted-foreground">{t("page.documents.euro_desc")}</p>
              </div>
            </div>
            {Object.entries(
              europeTemplates.reduce((acc, t) => {
                if (!acc[t.country]) acc[t.country] = [];
                acc[t.country].push(t);
                return acc;
              }, {} as Record<string, DocumentTemplate[]>)
            ).map(([country, templates]) => {
              const lawDepotUrls: Record<string, string> = {
                BE: "https://www.lawdepot.be/",
                ES: "https://www.lawdepot.com/es/",
                DE: "https://www.lawdepot.de/",
                IT: "https://www.lawdepot.it/",
                GB: "https://www.lawdepot.co.uk/",
                PT: "https://www.lawdepot.com/pt/",
                NL: "https://www.lawdepot.com/nl/",
                CH: "https://www.lawdepot.ch/",
                AT: "https://www.lawdepot.at/",
                LU: "https://www.lawdepot.be/",
                PL: "https://www.lawdepot.com/",
                SE: "https://www.lawdepot.com/",
                DK: "https://www.lawdepot.com/",
                NO: "https://www.lawdepot.com/",
                FI: "https://www.lawdepot.com/",
                GR: "https://www.lawdepot.com/",
                CZ: "https://www.lawdepot.com/",
                HU: "https://www.lawdepot.com/",
                RO: "https://www.lawdepot.com/",
                HR: "https://www.lawdepot.com/",
                IE: "https://www.lawdepot.co.uk/",
                BG: "https://www.lawdepot.com/",
                SK: "https://www.lawdepot.com/",
              };
              return (
              <div key={country}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-md font-semibold text-foreground">{countryLabels[country] || country}</h3>
                  {lawDepotUrls[country] && (
                    <a href={lawDepotUrls[country]} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-medium text-accent hover:underline flex items-center gap-1">
                      {t("page.documents.more_on")} <ChevronRight className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {templates.map((t) => (
                    <button key={t.id} onClick={() => setSelectedTemplate(t)}
                      className="flex items-start gap-4 bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover transition-all text-left group">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-gradient-gold transition-colors shrink-0">
                        <span className="text-xl">{getCountryFlag(country)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground text-sm">{t.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
                        <div className="text-xs text-muted-foreground/60 mt-1">v{t.version}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 mt-1 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
              );
            })}

            {/* LawDepot CTA */}
            <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 text-center">
              <Scale className="h-10 w-10 text-accent mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-1">{t("page.documents.need_doc")}</h3>
              <p className="text-sm text-muted-foreground mb-4">{t("page.documents.euro_desc")}</p>
              <a href="https://www.lawdepot.com/" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gradient-gold text-accent-foreground px-6 py-2.5 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity">
                {t("page.documents.access_lawdepot")} <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}
      </motion.div>
      </FeatureGate>
    </DashboardLayout>
  );
};

export default Documents;
