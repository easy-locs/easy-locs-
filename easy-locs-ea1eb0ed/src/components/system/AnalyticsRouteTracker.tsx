import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/engines/analytics/analytics-engine";
import { useAuth } from "@/contexts/AuthContext";
import { useReferralAttribution } from "@/hooks/useReferralAttribution";
import { useAutoRedeemReferral } from "@/hooks/useAutoRedeemReferral";

export default function AnalyticsRouteTracker() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  useReferralAttribution(user?.id);
  useAutoRedeemReferral();

  return null;
}
