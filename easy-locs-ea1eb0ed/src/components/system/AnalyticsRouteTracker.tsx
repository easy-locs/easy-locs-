import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/engines/analytics/analytics-engine";

export default function AnalyticsRouteTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  return null;
}
