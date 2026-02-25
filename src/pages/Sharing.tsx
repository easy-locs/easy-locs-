import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Share2, Link, Clock, ShieldCheck } from "lucide-react";

const Sharing = () => {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Partages</h1>
        <p className="text-muted-foreground text-sm mb-8">Partagez vos documents de façon sécurisée.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Link, label: "Liens temporaires", desc: "Partagez avec un lien qui expire automatiquement." },
            { icon: ShieldCheck, label: "Contrôle d'accès", desc: "Définissez qui peut voir vos documents." },
            { icon: Clock, label: "Historique", desc: "Suivez qui a consulté vos partages." },
          ].map((f) => (
            <div key={f.label} className="bg-card rounded-xl p-5 shadow-card border border-border/50">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3">
                <f.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="font-semibold text-foreground text-sm">{f.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{f.desc}</div>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-xl shadow-card border border-border/50 p-16 text-center">
          <Share2 className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Aucun partage actif</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Partagez un document depuis votre coffre-fort ou l'historique de vos documents.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Sharing;
