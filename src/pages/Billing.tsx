import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { CreditCard, CheckCircle, AlertTriangle } from "lucide-react";

const plans = [
  { name: "Individual", price: "12", features: ["2 PDF/mois", "Coffre-fort 100 Mo", "Quittances"], highlight: false },
  { name: "Landlord", price: "29", features: ["PDF illimités", "Baux & quittances", "Rappels", "Coffre-fort 1 Go"], highlight: true },
  { name: "Freelancer", price: "39", features: ["PDF illimités", "Documents entreprise", "Partages", "Coffre-fort 5 Go"], highlight: false },
  { name: "Business", price: "69", features: ["Tout inclus", "Multi-utilisateurs", "API accès", "Support prioritaire"], highlight: false },
];

const Billing = () => {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Abonnement</h1>
        <p className="text-muted-foreground text-sm mb-8">Gérez votre abonnement et votre facturation.</p>

        {/* Current plan */}
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Plan actuel</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-foreground">Mode Démo</span>
            <span className="bg-warning/20 text-warning text-xs font-medium px-2 py-0.5 rounded-full">Gratuit</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Connectez Stripe pour activer les abonnements payants.
          </p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-card rounded-xl p-6 shadow-card border transition-all ${
                plan.highlight ? "border-accent ring-2 ring-accent/20" : "border-border/50"
              }`}
            >
              <h3 className="font-semibold text-foreground text-lg">{plan.name}</h3>
              <div className="mt-2 mb-4">
                <span className="text-3xl font-bold text-foreground">{plan.price}€</span>
                <span className="text-sm text-muted-foreground">/mois</span>
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-success shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                disabled
                className="w-full py-2.5 rounded-lg text-sm font-semibold border border-border text-muted-foreground cursor-not-allowed opacity-60"
              >
                Bientôt disponible
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-start gap-3 bg-muted/50 rounded-lg p-4">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            L'intégration Stripe sera activée une fois le backend Lovable Cloud connecté.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Billing;
