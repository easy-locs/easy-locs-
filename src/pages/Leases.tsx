import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DocumentBuilder from "@/components/documents/DocumentBuilder";
import { Home, Plus, ChevronRight } from "lucide-react";
import { getTemplatesByCategory } from "@/lib/templates/registry";
import type { DocumentTemplate } from "@/lib/templates/types";

const Leases = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const leaseTemplates = getTemplatesByCategory("rental", "FR").filter(
    (t) => t.docType.startsWith("lease")
  );

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
          <h1 className="text-2xl font-bold text-foreground">Baux</h1>
          <p className="text-muted-foreground text-sm mt-1">Créez des contrats de bail conformes.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {leaseTemplates.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTemplate(t)}
              className="flex items-start gap-4 bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-gradient-gold transition-colors shrink-0">
                <Home className="h-5 w-5 text-muted-foreground group-hover:text-accent-foreground transition-colors" />
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
    </DashboardLayout>
  );
};

export default Leases;
