import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DocumentBuilder from "@/components/documents/DocumentBuilder";
import { getTemplatesByCategory } from "@/lib/templates/registry";
import type { DocumentTemplate } from "@/lib/templates/types";
import {
  Building2, FileText, ChevronRight, Plus, Users, Briefcase, XCircle,
  ArrowRight, ArrowLeft, CheckCircle, Rocket, MapPin, User
} from "lucide-react";

// Wizard steps
const entityTypes = [
  { key: "company-sas", label: "SAS", description: "Société par Actions Simplifiée — flexible, idéale pour startups et PME" },
  { key: "company-sarl", label: "SARL", description: "Société à Responsabilité Limitée — structure classique, encadrée" },
  { key: "micro-entrepreneur", label: "Micro-entreprise", description: "Statut simplifié pour activité individuelle" },
];

const wizardSteps = [
  { title: "Type de société", description: "Choisissez la forme juridique" },
  { title: "Informations", description: "Renseignez les détails" },
  { title: "Génération", description: "Créez vos documents" },
];

const sections = [
  {
    title: "Création d'entreprise",
    description: "Statuts et formalités de constitution",
    icon: Plus,
    filter: (t: DocumentTemplate) => ["company-sas", "company-sarl", "micro-entrepreneur"].includes(t.docType),
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

  if (selectedTemplate) {
    return (
      <DocumentBuilder
        template={selectedTemplate}
        onBack={() => { setSelectedTemplate(null); setWizardMode(false); setWizardStep(0); }}
        onGenerated={() => { setSelectedTemplate(null); setWizardMode(false); setWizardStep(0); }}
      />
    );
  }

  // Wizard mode
  if (wizardMode) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <button onClick={() => { setWizardMode(false); setWizardStep(0); }} className="text-sm text-accent hover:underline mb-6 flex items-center gap-1">
            ← Retour
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

          {/* Step 1: Info summary */}
          {wizardStep === 1 && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Récapitulatif</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Vous allez créer les documents pour une <strong>{entityTypes.find(e => e.key === selectedEntityType)?.label}</strong>.
              </p>
              <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 space-y-4">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-accent" />
                  <div>
                    <div className="text-sm font-medium text-foreground">Forme juridique</div>
                    <div className="text-xs text-muted-foreground">{entityTypes.find(e => e.key === selectedEntityType)?.label}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-accent" />
                  <div>
                    <div className="text-sm font-medium text-foreground">Documents générés</div>
                    <div className="text-xs text-muted-foreground">Statuts, formulaires de constitution, annonce légale</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Rocket className="h-5 w-5 text-accent" />
                  <div>
                    <div className="text-sm font-medium text-foreground">Prochaines étapes</div>
                    <div className="text-xs text-muted-foreground">Remplir le formulaire, générer le PDF, déposer au greffe</div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setWizardStep(0)} className="flex items-center gap-2 border border-border text-foreground text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-muted transition-colors">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </button>
                <button
                  onClick={() => {
                    const template = companyTemplates.find(t => t.docType === selectedEntityType);
                    if (template) setSelectedTemplate(template);
                  }}
                  className="flex items-center gap-2 bg-gradient-gold text-accent-foreground text-sm font-semibold px-6 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity"
                >
                  Créer les documents <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Entreprise</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Créez, gérez et modifiez votre société — comme sur LegalStart, directement depuis Adminia.
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
