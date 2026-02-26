import { useSubscriptionGating } from "@/hooks/useSubscriptionGating";
import UpgradeBanner from "./UpgradeBanner";

interface FeatureGateProps {
  feature: string;
  featureLabel?: string;
  children: React.ReactNode;
}

/**
 * Wraps a feature behind subscription gating.
 * Shows UpgradeBanner if the user's plan doesn't cover the feature.
 */
const FeatureGate = ({ feature, featureLabel, children }: FeatureGateProps) => {
  const { canAccess, requiresUpgrade, isLoading } = useSubscriptionGating();

  if (isLoading) return <>{children}</>;

  const upgrade = requiresUpgrade(feature);
  if (upgrade) {
    return <UpgradeBanner requiredTier={upgrade} featureLabel={featureLabel} />;
  }

  return <>{children}</>;
};

export default FeatureGate;
