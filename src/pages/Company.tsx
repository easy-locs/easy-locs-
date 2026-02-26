import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DocumentBuilder from "@/components/documents/DocumentBuilder";
import { getTemplatesByCategory } from "@/lib/templates/registry";
import type { DocumentTemplate } from "@/lib/templates/types";
import {
  Building2, FileText, ChevronRight, Plus, Users, Briefcase, XCircle,
  ArrowRight, ArrowLeft, CheckCircle, Rocket, ScrollText, ClipboardList
} from "lucide-react";

// Entity types for wizard
const entityTypes = [
  { key: "company-sas", label: "SAS", description: "Société par Actions Simplifiée — flexible, idéale pour startups et PME" },
  { key: "company-sarl", label: "SARL", description: "Société à Responsabilité Limitée — structure classique, encadrée" },
  { key: "company-eurl", label: "EURL", description: "Entreprise Unipersonnelle à Responsabilité Limitée — SARL à associé unique" },
  { key: "micro-entrepreneur", label: "Micro-entreprise", description: "Statut simplifié pour activité individuelle" },
];

// Map entity → related docs to generate
const entityDocuments: Record<string, { docType: string; label: string; icon: typeof FileText }[]> = {
  "company-sas": [
    { docType: "company-sas", label: "Statuts SAS", icon: ScrollText },
    { docType: "legal-notice", label: "Annonce légale de constitution", icon: FileText },
    { docType: "form-m0", label: "Formulaire M0 (Cerfa 13959)", icon: ClipboardList },
  ],
  "company-sarl": [
    { docType: "company-sarl", label: "Statuts SARL", icon: ScrollText },
    { docType: "legal-notice", label: "Annonce légale de constitution", icon: FileText },
    { docType: "form-m0", label: "Formulaire M0 (Cerfa 13959)", icon: ClipboardList },
  ],
  "company-eurl": [
    { docType: "company-eurl", label: "Statuts EURL", icon: ScrollText },
    { docType: "legal-notice", label: "Annonce légale de constitution", icon: FileText },
    { docType: "form-m0", label: "Formulaire M0 (Cerfa 13959)", icon: ClipboardList },
  ],
  "micro-entrepreneur": [
    { docType: "micro-entrepreneur", label: "Déclaration d'activité", icon: ScrollText },
    { docType: "form-p0", label: "Formulaire P0 (Cerfa 15253)", icon: ClipboardList },
  ],
};

const wizardSteps = [
  { title: "Type", description: "Forme juridique" },
  { title: "Documents", description: "Choisir le document" },
  { title: "Remplir", description: "Compléter et générer" },
];

const sections = [
  {
    title: "Création d'entreprise",
    description: "Statuts, annonces légales et formalités",
    icon: Plus,
    filter: (t: DocumentTemplate) => ["company-sas", "company-sarl", "company-eurl", "micro-entrepreneur", "legal-notice", "form-m0", "form-p0"].includes(t.docType),
  },
  {
    title: "Modifications statutaires",
    description: "Changements de dirigeant, siège, activité",
    icon: Briefcase,
    filter: (t: DocumentTemplate) => ["change-director", "change-office", "change-activity"].includes(t.docType),
  },
  {
    title: "Vie sociale & assemblées",
    description: "PV d'AG, approbation des comptes, cession de parts",
    icon: Users,
    filter: (t: DocumentTemplate) => ["pv-ago", "accounts-approval", "share-transfer", "capital-increase"].includes(t.docType),
  },
  {
    title: "Fermeture",
    description: "Dissolution et liquidation",
    icon: XCircle,
    filter: (t: DocumentTemplate) => ["dissolution"].includes(t.docType),
  },
];

const Company = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [wizardMode, setWizardMode] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [selectedEntityType, setSelectedEntityType] = useState<string | null>(null);
  const companyTemplates = getTemplatesByCategory("company", "FR");

  const resetWizard = () => {
    setSelectedTemplate(null);
    setWizardMode(false);
    setWizardStep(0);
    setSelectedEntityType(null);
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

  // Wizard mode
  if (wizardMode) {
    const docs = selectedEntityType ? entityDocuments[selectedEntityType] ?? [] : [];

    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <button onClick={resetWizard} className="text-sm text-accent hover:underline mb-6 flex items-center gap-1">
            ← Retour à l'accueil
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
              <h2 className="text-xl font-bold text-foreground mb-2">Quelle forme juridique ?</h2>
              <p className="text-sm text-muted-foreground mb-6">Choisissez le type de société à créer.</p>
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
                Continuer <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step 1: Document selection */}
          {wizardStep === 1 && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Documents pour votre {entityTypes.find(e => e.key === selectedEntityType)?.label}
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Sélectionnez le document à générer. Vous pourrez revenir ici pour les autres.
              </p>

              <div className="space-y-3">
                {docs.map((doc, i) => {
                  const template = companyTemplates.find(t => t.docType === doc.docType);
                  if (!template) return null;
                  const DocIcon = doc.icon;
                  return (
                    <button
                      key={doc.docType}
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
                            <span className="text-[10px] font-medium bg-accent/10 text-accent px-2 py-0.5 rounded-full">Principal</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{template.description}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex items-start gap-3 bg-muted/50 rounded-lg p-4">
                <Rocket className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Étapes après génération :</strong>
                  {selectedEntityType === "micro-entrepreneur" ? (
                    <span> Déclarez sur le guichet unique (formalites.entreprises.gouv.fr) avec votre formulaire P0.</span>
                  ) : (
                    <span> Signez les statuts → Déposez le capital → Publiez l'annonce légale → Déposez le dossier M0 au greffe.</span>
                  )}
                </div>
              </div>

              <button onClick={() => setWizardStep(0)} className="mt-4 flex items-center gap-2 border border-border text-foreground text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-muted transition-colors">
                <ArrowLeft className="h-4 w-4" /> Retour
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
            <h1 className="text-2xl font-bold text-foreground">Entreprise</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Créez, gérez et modifiez votre société — SAS, SARL, EURL ou micro-entreprise.
            </p>
          </div>
          <button
            onClick={() => setWizardMode(true)}
            className="flex items-center gap-2 bg-gradient-gold text-accent-foreground text-sm font-semibold px-4 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity"
          >
            <Rocket className="h-4 w-4" />
            Créer ma société
          </button>
        </div>

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
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t)}
                    className="flex items-start gap-4 bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-gradient-gold transition-colors shrink-0">
                      <FileText className="h-5 w-5 text-muted-foreground group-hover:text-accent-foreground transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground text-sm">{t.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
                      {t.legalBasis && <div className="text-xs text-muted-foreground/60 mt-1 italic">{t.legalBasis}</div>}
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
            Adminia prépare vos documents d'entreprise à titre informatif. L'immatriculation officielle doit être réalisée auprès des organismes compétents (guichet unique, greffe du tribunal de commerce).
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Company;
