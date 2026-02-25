import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Building2, FileText, CheckCircle } from "lucide-react";

const companyTypes = [
  { label: "Auto-entrepreneur", description: "Statut simplifié pour activité individuelle.", icon: FileText },
  { label: "SAS", description: "Société par Actions Simplifiée.", icon: Building2 },
  { label: "SARL", description: "Société à Responsabilité Limitée.", icon: Building2 },
];

const Company = () => {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Préparation entreprise</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Préparez la création de votre entreprise. Documents préparatoires uniquement.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {companyTypes.map((t) => (
            <button
              key={t.label}
              className="flex flex-col items-center gap-3 bg-card rounded-xl p-6 shadow-card border border-border/50 hover:shadow-card-hover transition-all text-center group"
            >
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center group-hover:bg-gradient-gold transition-colors">
                <t.icon className="h-6 w-6 text-muted-foreground group-hover:text-accent-foreground transition-colors" />
              </div>
              <div className="font-semibold text-foreground text-sm">{t.label}</div>
              <div className="text-xs text-muted-foreground">{t.description}</div>
            </button>
          ))}
        </div>

        <div className="bg-card rounded-xl shadow-card border border-border/50 p-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Checklist de création</h2>
          <div className="space-y-3">
            {[
              "Choisir la forme juridique",
              "Rédiger les statuts (brouillon)",
              "Définir le capital social",
              "Préparer le PV d'assemblée constitutive",
              "Ouvrir un compte bancaire professionnel",
              "Immatriculer l'entreprise (hors périmètre Adminia)",
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                <span className="text-sm text-foreground">{step}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 bg-muted/50 rounded-lg p-4">
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Adminia prépare vos documents de création d'entreprise à titre informatif uniquement.
            L'immatriculation officielle doit être réalisée auprès des organismes compétents.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Company;
