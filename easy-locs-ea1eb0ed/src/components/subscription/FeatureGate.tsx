import { useSubscriptionGating } from "@/hooks/useSubscriptionGating";
import UpgradeBanner from "./UpgradeBanner";

interface FeatureGateProps {
  feature: string;
  featureLabel?: string;
  children: React.ReactNode;
}

const FeatureGate = ({ feature, featureLabel, children }: FeatureGateProps) => {
  const { canAccess, isLoading } = useSubscriptionGating();

  if (isLoading) return null; // Don't grant access while loading

  if (!canAccess(feature)) {
    return <UpgradeBanner featureLabel={featureLabel} />;
  }

  return <>{children}</>;
};

export default FeatureGate;
