import { memo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import {
  Hospital, Landmark, Fuel, Shield, Flame, Pill, TreePine, ParkingCircle,
  Stethoscope, Droplets, Zap, Wifi, ShoppingCart, Scissors,
} from "lucide-react";

const ESSENTIAL_POIS = [
  { key: "hospital", icon: Hospital, labelKey: "dashboard.poi_hospital", to: "/radar?category=utility&subcategory=poi_hospital", color: "hsl(0 72% 51%)", bg: "hsl(0 72% 51% / 0.1)" },
  { key: "pharmacy", icon: Pill, labelKey: "dashboard.poi_pharmacy", to: "/radar?category=utility&subcategory=poi_pharmacy", color: "hsl(152 60% 42%)", bg: "hsl(152 60% 42% / 0.1)" },
  { key: "police", icon: Shield, labelKey: "dashboard.poi_police", to: "/radar?category=utility&subcategory=police_station", color: "hsl(220 60% 45%)", bg: "hsl(220 60% 45% / 0.1)" },
  { key: "fire", icon: Flame, labelKey: "dashboard.poi_fire", to: "/radar?category=utility&subcategory=fire_station", color: "hsl(16 85% 55%)", bg: "hsl(16 85% 55% / 0.1)" },
  { key: "park", icon: TreePine, labelKey: "dashboard.poi_park", to: "/radar?category=utility&subcategory=park", color: "hsl(142 70% 40%)", bg: "hsl(142 70% 40% / 0.1)" },
  { key: "atm", icon: Landmark, labelKey: "dashboard.poi_atm", to: "/radar?category=utility&subcategory=atm", color: "hsl(210 80% 52%)", bg: "hsl(210 80% 52% / 0.1)" },
  { key: "fuel", icon: Fuel, labelKey: "dashboard.poi_fuel", to: "/radar?category=utility&subcategory=fuel_station", color: "hsl(38 92% 50%)", bg: "hsl(38 92% 50% / 0.1)" },
  { key: "parking", icon: ParkingCircle, labelKey: "dashboard.poi_parking", to: "/radar?category=utility&subcategory=parking", color: "hsl(270 60% 55%)", bg: "hsl(270 60% 55% / 0.1)" },
  { key: "clinic", icon: Stethoscope, labelKey: "dashboard.poi_clinic", to: "/radar?category=utility&subcategory=clinic", color: "hsl(340 65% 50%)", bg: "hsl(340 65% 50% / 0.1)" },
  { key: "supermarket", icon: ShoppingCart, labelKey: "dashboard.poi_supermarket", to: "/browse/grocery", color: "hsl(25 85% 50%)", bg: "hsl(25 85% 50% / 0.1)" },
  { key: "barber", icon: Scissors, labelKey: "dashboard.poi_barber", to: "/browse/beauty", color: "hsl(300 50% 50%)", bg: "hsl(300 50% 50% / 0.1)" },
] as const;

const EssentialServicesStrip = memo(function EssentialServicesStrip() {
  const { t } = useI18n();

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2.5 px-1">
        <h2 className="text-[14px] font-black text-foreground flex items-center gap-1.5">
          <span>🏥</span> {t("dashboard.essential_services")}
        </h2>
        <Link
          to="/radar?category=utility"
          className="text-[11px] font-semibold flex items-center gap-0.5 active:opacity-70"
          style={{ color: "hsl(38 65% 56%)" }}
        >
          {t("dashboard.see_all")}
        </Link>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none px-1">
        {ESSENTIAL_POIS.map((poi, i) => {
          const Icon = poi.icon;
          return (
            <motion.div
              key={poi.key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03, type: "spring", stiffness: 500, damping: 30 }}
              className="shrink-0"
            >
              <Link
                to={poi.to}
                className="flex flex-col items-center gap-1.5 w-[64px] active:scale-[0.95] transition-transform"
              >
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: poi.bg }}
                >
                  <Icon className="w-5 h-5" style={{ color: poi.color }} />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground leading-snug text-center w-full break-words hyphens-auto">
                  {t(poi.labelKey)}
                </span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
});

export default EssentialServicesStrip;
