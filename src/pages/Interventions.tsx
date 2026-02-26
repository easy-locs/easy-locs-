import FeatureGate from "@/components/subscription/FeatureGate";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Wrench, Plus } from "lucide-react";

const Interventions = () => {
  return (
    <DashboardLayout>
      <FeatureGate feature="unlimited_properties" featureLabel="Interventions">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Interventions</h1>
            <p className="text-muted-foreground mt-1">Suivi des travaux et réparations sur vos biens</p>
          </div>
          <button className="flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" />
            Nouvelle intervention
          </button>
        </div>

        <div className="bg-card rounded-xl p-8 border border-border/50 shadow-card text-center">
          <Wrench className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Aucune intervention enregistrée. Ajoutez vos travaux et réparations pour en garder la trace.</p>
        </div>
      </div>
      </FeatureGate>
    </DashboardLayout>
  );
};

export default Interventions;
