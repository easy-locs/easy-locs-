import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DocumentBuilder from "@/components/documents/DocumentBuilder";
import { Home, FileText, ChevronRight } from "lucide-react";
import { getTemplatesByCategory } from "@/lib/templates/registry";
import type { DocumentTemplate } from "@/lib/templates/types";

const iconMap: Record<string, typeof Home> = {
  "lease": Home,
  "rent-receipt": FileText,
  "inventory": FileText,
  "rent-revision": FileText,
  "charges-regularization": FileText,
  "unpaid-notice": FileText,
};

const Leases = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const rentalTemplates = getTemplatesByCategory("rental", "FR");

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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Gestion locative</h1>
          <p className="text-muted-foreground text-sm mt-1">Baux, quittances, états des lieux, révisions et relances.</p>
        </div>

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
      </div>
    </DashboardLayout>
  );
};

export default Leases;
