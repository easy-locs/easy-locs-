import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ExternalLink, Zap, Phone, Landmark, Car, Wifi, Droplets, Flame } from "lucide-react";

const serviceGroups = [
  {
    title: "Énergie",
    icon: Flame,
    services: [
      { name: "EDF", url: "https://www.edf.fr/", description: "Électricité de France — gérer votre contrat" },
      { name: "Engie", url: "https://www.engie.fr/", description: "Gaz et électricité — espace client" },
      { name: "TotalEnergies", url: "https://www.totalenergies.fr/", description: "Offres gaz et électricité" },
    ],
  },
  {
    title: "Eau",
    icon: Droplets,
    services: [
      { name: "Veolia Eau", url: "https://www.eau.veolia.fr/", description: "Gestion de l'eau — espace client" },
      { name: "Suez Eau", url: "https://www.suez.fr/", description: "Eau et assainissement" },
    ],
  },
  {
    title: "Télécom & Internet",
    icon: Wifi,
    services: [
      { name: "Orange", url: "https://www.orange.fr/", description: "Forfaits mobile et internet" },
      { name: "SFR", url: "https://www.sfr.fr/", description: "Offres box et mobile" },
      { name: "Free", url: "https://www.free.fr/", description: "Forfaits mobile et Freebox" },
      { name: "Bouygues Telecom", url: "https://www.bouyguestelecom.fr/", description: "Offres mobile et fixe" },
    ],
  },
  {
    title: "Impôts & Administration",
    icon: Landmark,
    services: [
      { name: "impots.gouv.fr", url: "https://www.impots.gouv.fr/", description: "Déclarations et paiements d'impôts" },
      { name: "Service-Public.fr", url: "https://www.service-public.fr/", description: "Démarches administratives" },
      { name: "URSSAF", url: "https://www.urssaf.fr/", description: "Cotisations sociales" },
      { name: "Guichet Entreprises", url: "https://www.guichet-entreprises.fr/", description: "Formalités d'entreprise" },
    ],
  },
  {
    title: "Amendes & Contraventions",
    icon: Car,
    services: [
      { name: "amendes.gouv.fr", url: "https://www.amendes.gouv.fr/", description: "Paiement de contraventions" },
      { name: "ANTAI", url: "https://www.antai.gouv.fr/", description: "Contestation d'amendes" },
    ],
  },
];

const Services = () => {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Services & Paiements</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Accédez rapidement aux services pour gérer vos factures, impôts et démarches.
        </p>

        {serviceGroups.map((group) => {
          const GroupIcon = group.icon;
          return (
            <div key={group.title} className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <GroupIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <h2 className="text-base font-semibold text-foreground">{group.title}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {group.services.map((service) => (
                  <a
                    key={service.name}
                    href={service.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 bg-card rounded-xl p-4 shadow-card border border-border/50 hover:shadow-card-hover hover:border-accent/30 transition-all group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground text-sm">{service.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{service.description}</div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground/40 group-hover:text-accent transition-colors shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          );
        })}

        <div className="mt-6 flex items-start gap-3 bg-muted/50 rounded-lg p-4">
          <Zap className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Ces liens vous redirigent vers les sites officiels des services. Adminia ne gère pas directement les paiements de ces organismes.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Services;
