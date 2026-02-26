import FeatureGate from "@/components/subscription/FeatureGate";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Wrench, Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const Interventions = () => {
  const { t } = useI18n();
  return (
    <DashboardLayout>
      <FeatureGate feature="unlimited_properties" featureLabel={t("page.interventions.title")}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("page.interventions.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("page.interventions.subtitle")}</p>
          </div>
          <button className="flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" />
            {t("page.interventions.new")}
          </button>
        </div>

        <div className="bg-card rounded-xl p-8 border border-border/50 shadow-card text-center">
          <Wrench className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">{t("page.interventions.empty")}</p>
        </div>
      </div>
      </FeatureGate>
    </DashboardLayout>
  );
};

export default Interventions;
