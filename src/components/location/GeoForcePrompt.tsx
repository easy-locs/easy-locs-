/**
 * GeoForcePrompt — Shown when GPS permission is denied.
 * Non-blocking banner that re-triggers the native prompt on tap.
 * Uses i18n for all user-facing strings.
 */
import { useGeoStore } from "@/lib/geo/geo-store";
import { geoService } from "@/lib/geo/geo-service";
import { MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n, tSafe } from "@/lib/i18n";

export default function GeoForcePrompt() {
  const { t } = useI18n();
  const permission = useGeoStore((s) => s.permission);
  const loading = useGeoStore((s) => s.loading);
  const point = useGeoStore((s) => s.point);

  const show = !loading && (permission === "denied" || (!point && permission !== "granted"));

  const handleRetry = () => {
    geoService.forceRetry();
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          onClick={handleRetry}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary/10 border border-primary/20 active:scale-[0.98] transition-transform mb-2"
        >
          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <MapPin className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-[11px] font-bold text-foreground">📍 {tSafe(t, "geo_enable_location", "Enable location")}</p>
            <p className="text-[10px] text-muted-foreground">{tSafe(t, "geo_enable_location_desc", "Allow access for nearby results")}</p>
          </div>
          <span className="text-[10px] font-bold text-primary shrink-0">{tSafe(t, "geo_enable_btn", "Enable")}</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
