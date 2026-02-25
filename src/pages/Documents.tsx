import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Send, FileText, XCircle, AlertTriangle, ShieldCheck } from "lucide-react";

const templates = [
  { icon: FileText, label: "Attestation sur l'honneur", description: "Déclaration solennelle pour diverses démarches." },
  { icon: XCircle, label: "Lettre de résiliation", description: "Résiliation de contrat (assurance, abonnement…)." },
  { icon: AlertTriangle, label: "Mise en demeure", description: "Lettre de mise en demeure formelle." },
  { icon: Send, label: "Lettre recommandée", description: "Modèle de lettre recommandée avec AR." },
  { icon: ShieldCheck, label: "Modèle RGPD", description: "Demande de suppression ou d'accès aux données." },
];

const Documents = () => {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Documents administratifs</h1>
        <p className="text-muted-foreground text-sm mb-8">Générez vos documents conformes en quelques clics.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {templates.map((t) => (
            <button
              key={t.label}
              className="flex items-start gap-4 bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-gradient-gold transition-colors shrink-0">
                <t.icon className="h-5 w-5 text-muted-foreground group-hover:text-accent-foreground transition-colors" />
              </div>
              <div>
                <div className="font-semibold text-foreground text-sm">{t.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Documents;
