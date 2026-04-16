import { memo } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useCustomerMobilityStore } from "@/stores/customerMobilityStore";
import { Navigation, Package } from "lucide-react";

const LiveTrackingBanner = memo(function LiveTrackingBanner() {
  const { t } = useI18n();
  const jobs = useCustomerMobilityStore(s => s.jobs);

  const activeRides = jobs.filter(j =>
    j.job_type === "taxi" && !["completed", "cancelled", "failed_no_rider", "expired"].includes(j.status)
  );
  const activeDeliveries = jobs.filter(j =>
    j.job_type !== "taxi" && !["completed", "cancelled", "failed_no_rider", "expired"].includes(j.status)
  );

  if (activeRides.length === 0 && activeDeliveries.length === 0) return null;

  return (
    <div className="space-y-2" style={{ marginBottom: "var(--section-gap)" }}>
      {activeRides.length > 0 && (
        <Link to="/mobility/taxi" className="home-card--gradient flex items-center gap-3 px-3.5 py-3 active:scale-[0.98] transition-transform">
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "hsl(var(--accent) / 0.15)" }}>
            <Navigation className="h-4 w-4" style={{ color: "hsl(var(--accent))" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white">{activeRides.length} {t("dashboard.rides_in_progress")}</p>
            <p className="text-[0.625rem]" style={{ color: "hsl(var(--accent) / 0.7)" }}>{t("dashboard.tap_to_track")}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "hsl(var(--accent))" }} />
            <span className="text-[0.625rem] font-bold" style={{ color: "hsl(var(--accent))" }}>LIVE</span>
          </div>
        </Link>
      )}
      {activeDeliveries.length > 0 && (
        <Link to="/mobility/delivery" className="home-card--gradient flex items-center gap-3 px-3.5 py-3 active:scale-[0.98] transition-transform">
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "hsl(142 71% 45% / 0.15)" }}>
            <Package className="h-4 w-4" style={{ color: "hsl(142 71% 45%)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white">{activeDeliveries.length} {t("dashboard.delivery_in_progress")}</p>
            <p className="text-[0.625rem]" style={{ color: "hsl(142 71% 45% / 0.7)" }}>{t("dashboard.tap_to_track")}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "hsl(142 71% 45%)" }} />
            <span className="text-[0.625rem] font-bold" style={{ color: "hsl(142 71% 45%)" }}>LIVE</span>
          </div>
        </Link>
      )}
    </div>
  );
});

export default LiveTrackingBanner;
