import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DocumentBuilder from "@/components/documents/DocumentBuilder";
import { getTemplatesByCategory } from "@/lib/templates/registry";
import type { DocumentTemplate } from "@/lib/templates/types";
import { JAL_PUBLISHERS, getJALByDepartment, type JALPublisher } from "@/lib/jal-publishers";
import * as companyRepo from "@/repositories/company.repository";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import AddressAutocomplete, { type AddressResult } from "@/components/ui/AddressAutocomplete";
import {
  Building2, FileText, ChevronRight, Plus, Users, Briefcase, XCircle,
  ArrowRight, ArrowLeft, CheckCircle, Rocket, ScrollText, ClipboardList,
  Newspaper, CreditCard, ExternalLink, Loader2, Search
} from "lucide-react";
import CountrySelect from "@/components/ui/CountrySelect";
import { Input } from "@/components/ui/input";
import { getCountryFlag } from "@/lib/global-country-registry";
import { useCountryFilter } from "@/hooks/useCountryFilter";
import { useAuth } from "@/contexts/AuthContext";

const Company = () => {
  const { toast } = useToast();
  const { t } = useI18n();
  const { orgId } = useAuth();
  const countryFilter = useCountryFilter();
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [wizardMode, setWizardMode] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [selectedEntityType, setSelectedEntityType] = useState<string | null>(null);
  const [showJALPanel, setShowJALPanel] = useState(false);
  const [jalDepartment, setJalDepartment] = useState("");
  const [selectedJAL, setSelectedJAL] = useState<JALPublisher | null>(null);
  const [payingJAL, setPayingJAL] = useState(false);
  const [registeredAddress, setRegisteredAddress] = useState("");
  const [detectedDepartment, setDetectedDepartment] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>(countryFilter || "FR");

  // Load user's country from profile
  useEffect(() => {
    if (countryFilter) { setSelectedCountry(countryFilter); return; }
    companyRepo.fetchUserCountry().then((country) => {
      if (country) setSelectedCountry(country);
    });
  }, [countryFilter]);

  const companyTemplates = getTemplatesByCategory("company", selectedCountry as any);

  // Entity types for wizard
  const entityTypes = [
    { key: "company-sas", label: t("page.company.entity_sas"), description: t("page.company.entity_sas_desc") },
    { key: "company-sarl", label: t("page.company.entity_sarl"), description: t("page.company.entity_sarl_desc") },
    { key: "company-eurl", label: t("page.company.entity_eurl"), description: t("page.company.entity_eurl_desc") },
    { key: "micro-entrepreneur", label: t("page.company.entity_micro"), description: t("page.company.entity_micro_desc") },
  ];

  // Map entity → related docs to generate
  const entityDocuments: Record<string, { docType: string; label: string; icon: typeof FileText }[]> = {
    "company-sas": [
      { docType: "company-sas", label: t("page.company.doc_statuts_sas"), icon: ScrollText },
      { docType: "legal-notice", label: t("page.company.doc_legal_notice"), icon: FileText },
      { docType: "form-m0", label: t("page.company.doc_form_m0"), icon: ClipboardList },
    ],
    "company-sarl": [
      { docType: "company-sarl", label: t("page.company.doc_statuts_sarl"), icon: ScrollText },
      { docType: "legal-notice", label: t("page.company.doc_legal_notice"), icon: FileText },
      { docType: "form-m0", label: t("page.company.doc_form_m0"), icon: ClipboardList },
    ],
    "company-eurl": [
      { docType: "company-eurl", label: t("page.company.doc_statuts_eurl"), icon: ScrollText },
      { docType: "legal-notice", label: t("page.company.doc_legal_notice"), icon: FileText },
      { docType: "form-m0", label: t("page.company.doc_form_m0"), icon: ClipboardList },
    ],
    "micro-entrepreneur": [
      { docType: "micro-entrepreneur", label: t("page.company.doc_activity_decl"), icon: ScrollText },
      { docType: "form-p0", label: t("page.company.doc_form_p0"), icon: ClipboardList },
    ],
  };

  const wizardSteps = [
    { title: t("page.company.wizard_step_type"), description: t("page.company.wizard_step_type_desc") },
    { title: t("page.company.wizard_step_docs"), description: t("page.company.wizard_step_docs_desc") },
    { title: t("page.company.wizard_step_fill"), description: t("page.company.wizard_step_fill_desc") },
  ];

  const sections = [
    {
      title: t("page.company.section_creation"),
      description: t("page.company.section_creation_desc"),
      icon: Plus,
      filter: (tpl: DocumentTemplate) => ["company-sas", "company-sarl", "company-eurl", "micro-entrepreneur", "legal-notice", "form-m0", "form-p0"].includes(tpl.docType),
    },
    {
      title: t("page.company.section_changes"),
      description: t("page.company.section_changes_desc"),
      icon: Briefcase,
      filter: (tpl: DocumentTemplate) => ["change-director", "change-office", "change-activity"].includes(tpl.docType),
    },
    {
      title: t("page.company.section_social"),
      description: t("page.company.section_social_desc"),
      icon: Users,
      filter: (tpl: DocumentTemplate) => ["pv-ago", "accounts-approval", "share-transfer", "capital-increase"].includes(tpl.docType),
    },
    {
      title: t("page.company.section_closure"),
      description: t("page.company.section_closure_desc"),
      icon: XCircle,
      filter: (tpl: DocumentTemplate) => ["dissolution"].includes(tpl.docType),
    },
  ];

  const resetWizard = () => {
    setSelectedTemplate(null);
    setWizardMode(false);
    setWizardStep(0);
    setSelectedEntityType(null);
    setShowJALPanel(false);
    setSelectedJAL(null);
  };

  // Auto-use detected department if user hasn't typed manually
  const effectiveDept = jalDepartment || detectedDepartment;
  const filteredJALs = effectiveDept.length >= 2
    ? getJALByDepartment(effectiveDept)
    : JAL_PUBLISHERS.slice(0, 15);

  const handleAddressSelect = (result: AddressResult) => {
    setRegisteredAddress(result.label);
    if (result.department) {
      setDetectedDepartment(result.department);
    }
  };

  const handlePayLegalNotice = async () => {
    if (!selectedJAL) return;
    setPayingJAL(true);
    try {
      const data = await companyRepo.createLegalNoticePayment(selectedJAL.name);
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: t("page.common.error"), description: err.message || t("page.common.error"), variant: "destructive" });
    } finally {
      setPayingJAL(false);
    }
  };

  // Document builder view
  if (selectedTemplate) {
    return (
      <DocumentBuilder
        template={selectedTemplate}
        onBack={() => {
          setSelectedTemplate(null);
          if (wizardMode) setWizardStep(1);
        }}
        onGenerated={resetWizard}
      />
    );
  }

  // JAL selection panel
  if (showJALPanel) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <button onClick={() => setShowJALPanel(false)} className="text-sm text-accent hover:underline mb-6 flex items-center gap-1">
            {t("page.company.back_docs")}
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <Newspaper className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{t("page.company.jal_title")}</h1>
              <p className="text-sm text-muted-foreground">{t("page.company.jal_subtitle")}</p>
            </div>
          </div>

          {/* Price banner */}
          <div className="bg-accent/10 border border-accent/30 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-foreground">{t("page.company.jal_label")}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{t("page.company.jal_all_included")}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-foreground">{t("page.company.jal_price")}</div>
                <div className="text-xs text-muted-foreground">{t("page.company.jal_ttc")}</div>
              </div>
            </div>
          </div>

          {/* Address autocomplete for department auto-detect */}
          <div className="mb-4">
            <AddressAutocomplete
              label={t("page.company.jal_address")}
              value={registeredAddress}
              onChange={setRegisteredAddress}
              onSelect={handleAddressSelect}
              placeholder={t("page.company.jal_address_placeholder")}
            />
            {detectedDepartment && !jalDepartment && (
              <p className="text-xs text-accent mt-1.5 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                {t("page.company.jal_dept_detected").replace("{dept}", detectedDepartment)}
              </p>
            )}
          </div>

          {/* Department search */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {t("page.company.jal_search_dept")}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={jalDepartment}
                onChange={(e) => setJalDepartment(e.target.value)}
                placeholder={t("page.company.jal_search_placeholder")}
                className="pl-9"
              />
            </div>
          </div>

          {/* JAL list */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredJALs.map((jal) => (
              <button
                key={jal.name}
                onClick={() => setSelectedJAL(jal)}
                className={`w-full flex items-center gap-4 bg-card rounded-xl p-4 border transition-all text-left ${
                  selectedJAL?.name === jal.name
                    ? "border-accent ring-2 ring-accent/20 shadow-card-hover"
                    : "border-border/50 shadow-card hover:shadow-card-hover"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  selectedJAL?.name === jal.name ? "bg-accent/20" : "bg-muted"
                }`}>
                  <Newspaper className={`h-4 w-4 ${selectedJAL?.name === jal.name ? "text-accent" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground text-sm">{jal.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t("page.company.jal_dept_prefix")} {jal.departments.join(", ")}
                  </div>
                </div>
                {jal.website && (
                  <a href={jal.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                    className="text-muted-foreground hover:text-accent">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                {selectedJAL?.name === jal.name && <CheckCircle className="h-5 w-5 text-accent shrink-0" />}
              </button>
            ))}
          </div>

          {effectiveDept.length >= 2 && filteredJALs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              {t("page.company.jal_not_found").replace("{dept}", effectiveDept)}
            </p>
          )}

          {/* Pay button */}
          <button
            onClick={handlePayLegalNotice}
            disabled={!selectedJAL || payingJAL}
            className="mt-6 w-full flex items-center justify-center gap-2 bg-gradient-gold text-accent-foreground font-semibold py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {payingJAL ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                {t("page.company.jal_pay")}
              </>
            )}
          </button>

          <p className="text-xs text-muted-foreground text-center mt-3">
            {t("page.company.jal_secure")}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // Wizard mode
  if (wizardMode) {
    const docs = selectedEntityType ? entityDocuments[selectedEntityType] ?? [] : [];

    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <button onClick={resetWizard} className="text-sm text-accent hover:underline mb-6 flex items-center gap-1">
            {t("page.company.back_home")}
          </button>

          {/* Progress */}
          <div className="flex items-center gap-2 mb-8">
            {wizardSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  i <= wizardStep ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
                }`}>
                  {i < wizardStep ? <CheckCircle className="h-4 w-4" /> : i + 1}
                </div>
                <div className="hidden sm:block">
                  <div className={`text-xs font-medium ${i <= wizardStep ? "text-foreground" : "text-muted-foreground"}`}>{step.title}</div>
                </div>
                {i < wizardSteps.length - 1 && <div className={`flex-1 h-0.5 ${i < wizardStep ? "bg-accent/30" : "bg-muted"}`} />}
              </div>
            ))}
          </div>

          {/* Step 0: Entity type */}
          {wizardStep === 0 && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">{t("page.company.wizard_entity_title")}</h2>
              <p className="text-sm text-muted-foreground mb-6">{t("page.company.wizard_entity_subtitle")}</p>
              <div className="space-y-3">
                {entityTypes.map((et) => (
                  <button
                    key={et.key}
                    onClick={() => setSelectedEntityType(et.key)}
                    className={`w-full flex items-center gap-4 bg-card rounded-xl p-5 border transition-all text-left ${
                      selectedEntityType === et.key ? "border-accent ring-2 ring-accent/20 shadow-card-hover" : "border-border/50 shadow-card hover:shadow-card-hover"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                      selectedEntityType === et.key ? "bg-accent/20" : "bg-muted"
                    }`}>
                      <Building2 className={`h-5 w-5 ${selectedEntityType === et.key ? "text-accent" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-foreground">{et.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{et.description}</div>
                    </div>
                    {selectedEntityType === et.key && <CheckCircle className="h-5 w-5 text-accent shrink-0" />}
                  </button>
                ))}
              </div>
              <button
                onClick={() => selectedEntityType && setWizardStep(1)}
                disabled={!selectedEntityType}
                className="mt-6 flex items-center gap-2 bg-gradient-gold text-accent-foreground text-sm font-semibold px-6 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {t("page.company.continue")} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step 1: Document selection */}
          {wizardStep === 1 && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                {t("page.company.wizard_docs_title").replace("{type}", entityTypes.find(e => e.key === selectedEntityType)?.label || "")}
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                {t("page.company.wizard_docs_subtitle")}
              </p>

              <div className="space-y-3">
                {docs.map((doc, i) => {
                  const template = companyTemplates.find(tpl => tpl.docType === doc.docType);
                  if (!template) return null;
                  const DocIcon = doc.icon;
                  const isLegalNotice = doc.docType === "legal-notice";
                  return (
                    <div key={doc.docType}>
                      <button
                        onClick={() => setSelectedTemplate(template)}
                        className="w-full flex items-center gap-4 bg-card rounded-xl p-5 border border-border/50 shadow-card hover:shadow-card-hover transition-all text-left group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-accent/20 transition-colors shrink-0">
                          <DocIcon className="h-5 w-5 text-muted-foreground group-hover:text-accent transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground text-sm">{doc.label}</span>
                            {i === 0 && (
                              <span className="text-[10px] font-medium bg-accent/10 text-accent px-2 py-0.5 rounded-full">{t("page.company.doc_primary")}</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">{template.description}</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      </button>
                      {/* Legal notice → pay to publish */}
                      {isLegalNotice && (
                        <button
                          onClick={() => setShowJALPanel(true)}
                          className="w-full mt-2 flex items-center gap-3 bg-accent/5 border border-accent/20 rounded-lg px-5 py-3 text-left hover:bg-accent/10 transition-colors"
                        >
                          <Newspaper className="h-4 w-4 text-accent shrink-0" />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-foreground">{t("page.company.jal_publish")}</span>
                            <span className="text-xs text-muted-foreground ml-2">{t("page.company.jal_price_inline")}</span>
                          </div>
                          <CreditCard className="h-4 w-4 text-accent shrink-0" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex items-start gap-3 bg-muted/50 rounded-lg p-4">
                <Rocket className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">{t("page.company.steps_after")}</strong>
                  {selectedEntityType === "micro-entrepreneur" ? (
                    <span> {t("page.company.steps_micro")}</span>
                  ) : (
                    <span> {t("page.company.steps_company")}</span>
                  )}
                </div>
              </div>

              <button onClick={() => setWizardStep(0)} className="mt-4 flex items-center gap-2 border border-border text-foreground text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-muted transition-colors">
                <ArrowLeft className="h-4 w-4" /> {t("page.company.back")}
              </button>
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // Main view
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("page.company.title")}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t("page.company.subtitle")}
            </p>
          </div>
          {selectedCountry === "FR" && (
            <button
              onClick={() => setWizardMode(true)}
              className="flex items-center gap-2 bg-gradient-gold text-accent-foreground text-sm font-semibold px-4 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity"
            >
              <Rocket className="h-4 w-4" />
              {t("page.company.create_company")}
            </button>
          )}
        </div>

        {/* Country selector */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-lg">{getCountryFlag(selectedCountry)}</span>
            <span>Pays des documents</span>
          </div>
          <div className="w-full sm:w-[360px]">
            <CountrySelect
              value={selectedCountry}
              onChange={(code) => setSelectedCountry(code || "FR")}
              placeholder="Choisir un pays"
            />
          </div>
        </div>

        {/* JAL panel only for France */}
        {selectedCountry === "FR" && (
          <div className="mb-6">
            <button
              onClick={() => setShowJALPanel(true)}
              className="flex items-center gap-2 border border-border text-foreground text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-muted transition-colors"
            >
              <Newspaper className="h-4 w-4" />
              {t("page.company.legal_notice_btn")}
            </button>
          </div>
        )}

        {companyTemplates.length === 0 ? (
          <div className="bg-card rounded-xl shadow-card border border-border/50 p-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">{t("page.company.no_templates") || `No company documents available for ${selectedCountry}`}</p>
            <p className="text-muted-foreground/60 text-xs mt-2">{t("page.company.templates_coming") || "Company templates are available for France. More countries coming soon."}</p>
          </div>
        ) : (
        <>
        {sections.map((section) => {
          const templates = companyTemplates.filter(section.filter);
          if (templates.length === 0) return null;
          const SectionIcon = section.icon;
          return (
            <div key={section.title} className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <SectionIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
                  <p className="text-xs text-muted-foreground">{section.description}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl)}
                    className="flex items-start gap-4 bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-gradient-gold transition-colors shrink-0">
                      <FileText className="h-5 w-5 text-muted-foreground group-hover:text-accent-foreground transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground text-sm">{tpl.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{tpl.description}</div>
                      {tpl.legalBasis && <div className="text-xs text-muted-foreground/60 mt-1 italic">{tpl.legalBasis}</div>}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 mt-1 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        <div className="mt-6 flex items-start gap-3 bg-muted/50 rounded-lg p-4">
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t("page.company.disclaimer")}
          </p>
        </div>
        </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Company;
