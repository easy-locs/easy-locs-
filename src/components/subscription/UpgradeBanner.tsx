import { Link } from "react-router-dom";
import { Lock, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface UpgradeBannerProps {
  requiredTier?: string;
  featureLabel?: string;
}

const UpgradeBanner = ({ featureLabel }: UpgradeBannerProps) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">
        {featureLabel || t("gating.feature_locked")}
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
        {t("page.upgrade.desc")}
      </p>
      <Link
        to="/dashboard/billing"
        className="flex items-center gap-2 bg-gradient-gold text-accent-foreground font-semibold px-6 py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity"
      >
        {t("page.upgrade.cta")} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
};

export default UpgradeBanner;
