import { memo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { useCustomerMobilityStore } from "@/stores/customerMobilityStore";
import {
  UtensilsCrossed, Car, Package, Hotel, Plane, CalendarDays, Building2, Wrench,
  Navigation, Clock, ChevronRight,
} from "lucide-react";

const SUPER_SERVICES = [
  { key: "food", icon: UtensilsCrossed, labelKey: "dashboard.food_order", to: "/food", gradient: "from-orange-500/15 to-red-500/8", iconColor: "text-orange-500" },
  { key: "taxi", icon: Car, labelKey: "dashboard.taxi_ride", to: "/mobility/taxi", gradient: "from-blue-500/15 to-indigo-500/8", iconColor: "text-blue-500" },
  { key: "delivery", icon: Package, labelKey: "dashboard.delivery", to: "/mobility/delivery", gradient: "from-emerald-500/15 to-green-500/8", iconColor: "text-emerald-500" },
  { key: "hotel", icon: Hotel, labelKey: "dashboard.hotel_booking", to: "/travel/stays", gradient: "from-violet-500/15 to-purple-500/8", iconColor: "text-violet-500" },
  { key: "flights", icon: Plane, labelKey: "dashboard.flights", to: "/travel/flights", gradient: "from-sky-500/15 to-cyan-500/8", iconColor: "text-sky-500" },
  { key: "seasonal", icon: CalendarDays, labelKey: "dashboard.seasonal", to: "/seasonal-rentals", gradient: "from-amber-500/15 to-yellow-500/8", iconColor: "text-amber-500" },
  { key: "realestate", icon: Building2, labelKey: "dashboard.real_estate", to: "/property", gradient: "from-rose-500/15 to-pink-500/8", iconColor: "text-rose-500" },
  { key: "services", icon: Wrench, labelKey: "dashboard.services_booking", to: "/services-hub", gradient: "from-slate-500/15 to-gray-500/8", iconColor: "text-slate-500" },
] as const;

const SuperServicesGrid = memo(function SuperServicesGrid() {
  const { t } = useI18n();
  const jobs = useCustomerMobilityStore(s => s.jobs);

  const activeRides = jobs.filter(j =>
    j.job_type === "taxi" && !["completed", "cancelled", "failed_no_rider", "expired"].includes(j.status)
  );
  const activeDeliveries = jobs.filter(j =>
    j.job_type !== "taxi" && !["completed", "cancelled", "failed_no_rider", "expired"].includes(j.status)
  );

  return (
    <div className="mb-5">
      {(activeRides.length > 0 || activeDeliveries.length > 0) && (
        <div className="space-y-2 mb-3">
          {activeRides.length > 0 && (
            <Link to="/mobility/taxi" className="flex items-center gap-3 rounded-xl px-3.5 py-3 active:scale-[0.98] transition-transform"
              style={{ background: "hsl(220 40% 18%)", border: "1px solid hsl(38 65% 56% / 0.2)" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "hsl(38 65% 56% / 0.15)" }}>
                <Navigation className="h-4 w-4" style={{ color: "hsl(38 65% 56%)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white">{activeRides.length} {t("dashboard.rides_in_progress")}</p>
                <p className="text-[10px]" style={{ color: "hsl(38 65% 56% / 0.7)" }}>{t("dashboard.tap_to_track")}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "hsl(38 65% 56%)" }} />
                <span className="text-[10px] font-bold" style={{ color: "hsl(38 65% 56%)" }}>LIVE</span>
              </div>
            </Link>
          )}
          {activeDeliveries.length > 0 && (
            <Link to="/mobility/delivery" className="flex items-center gap-3 rounded-xl px-3.5 py-3 active:scale-[0.98] transition-transform"
              style={{ background: "hsl(220 40% 18%)", border: "1px solid hsl(142 71% 45% / 0.2)" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "hsl(142 71% 45% / 0.15)" }}>
                <Package className="h-4 w-4" style={{ color: "hsl(142 71% 45%)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white">{activeDeliveries.length} {t("dashboard.delivery_in_progress")}</p>
                <p className="text-[10px]" style={{ color: "hsl(142 71% 45% / 0.7)" }}>{t("dashboard.tap_to_track")}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "hsl(142 71% 45%)" }} />
                <span className="text-[10px] font-bold" style={{ color: "hsl(142 71% 45%)" }}>LIVE</span>
              </div>
            </Link>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-2.5 px-1">
        <h2 className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
          <span>⚡</span> {t("dashboard.super_services")}
        </h2>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {SUPER_SERVICES.map((svc, i) => {
          const Icon = svc.icon;
          return (
            <motion.div
              key={svc.key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.025, duration: 0.2 }}
            >
              <Link
                to={svc.to}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br ${svc.gradient} border border-border/10 p-3 min-h-[72px] active:scale-[0.95] transition-all`}
              >
                <Icon className={`w-5 h-5 ${svc.iconColor} shrink-0`} />
                <span className="text-[10px] font-bold text-foreground leading-tight text-center line-clamp-2 w-full">
                  {t(svc.labelKey)}
                </span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
});

export default SuperServicesGrid;
