import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DocumentBuilder from "@/components/documents/DocumentBuilder";
import { Building2, FileText, ChevronRight, Plus, Users, MapPin, Briefcase, TrendingUp, XCircle } from "lucide-react";
import { getTemplatesByCategory } from "@/lib/templates/registry";
import type { DocumentTemplate } from "@/lib/templates/types";

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
  const companyTemplates = getTemplatesByCategory("company", "FR");

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
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Entreprise</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Créez, gérez et modifiez votre société — comme sur LegalStart, directement depuis Adminia.
        </p>

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
