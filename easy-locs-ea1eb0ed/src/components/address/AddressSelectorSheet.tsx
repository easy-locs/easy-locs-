/**
 * AddressSelectorSheet — Full-page slide-up address selector.
 * Uses GEO BRAIN as single source of truth for address operations.
 * Premium UX: GPS button, saved places, recent history, smooth transitions.
 */
import { useState, useCallback } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { CanonicalAddressInput } from "@/components/address/CanonicalAddressInput";
import { useLocationStore } from "@/stores/locationStore";
import { setAddressFromPlace, requestGPS } from "@/lib/brain/geo-brain";
import { useSmartLocation } from "@/hooks/useSmartLocation";
import type { CanonicalPlace } from "@/lib/address/canonical-place";
import { MapPin, Navigation, X, Home, Briefcase, Clock, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fromSavedPlace } from "@/lib/address/canonical-place";
import { useI18n } from "@/lib/i18n";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contextType?: string;
}

export function AddressSelectorSheet({ open, onOpenChange, contextType = "global" }: Props) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<CanonicalPlace | null>(null);
  const permissionState = useLocationStore((s) => s.permissionState);
  const { home, work, recents, currentLocation } = useSmartLocation();

  const handlePlaceSelect = useCallback((place: CanonicalPlace | null) => {
    if (!place) return;
    setSelected(place);
    setAddressFromPlace(place);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleUseGPS = useCallback(() => {
    requestGPS();
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSavedSelect = useCallback((saved: ReturnType<typeof useSmartLocation>["home"]) => {
    if (!saved) return;
    const cp = fromSavedPlace(saved);
    if (cp) {
      setAddressFromPlace(cp);
      onOpenChange(false);
    }
  }, [onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[92dvh] rounded-t-3xl p-0 flex flex-col overflow-hidden"
        style={{ borderTop: "1px solid hsl(var(--border) / 0.12)" }}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--accent) / 0.1)" }}>
              <MapPin className="w-4.5 h-4.5" style={{ color: "hsl(var(--accent))" }} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold tracking-tight break-words" style={{ color: "hsl(var(--foreground))" }}>{t("address.delivery_address") || "Delivery address"}</h2>
              <p className="text-xs leading-relaxed break-words" style={{ color: "hsl(var(--muted-foreground))" }}>{t("address.where_deliver") || "Where should we deliver?"}</p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: "hsl(var(--muted) / 0.6)" }}
          >
            <X className="h-4 w-4" style={{ color: "hsl(var(--muted-foreground))" }} />
          </button>
        </div>

        <div className="px-5 pb-3">
          <CanonicalAddressInput
            value={selected}
            onChange={handlePlaceSelect}
            placeholder={t("address.search_placeholder") || "Search for a place, tower, mall, landmark..."}
            contextType={contextType as any}
            allowSavedPlaces={false}
            className="w-full"
          />
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-[env(safe-area-inset-bottom,24px)]">
          {permissionState !== "denied" && (
            <motion.button
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleUseGPS}
              className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl active:scale-[0.98] transition-all text-left mb-4"
              style={{
                border: "1px solid hsl(var(--accent) / 0.15)",
                background: "hsl(var(--accent) / 0.05)",
              }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--accent) / 0.12)" }}>
                <Navigation className="w-5 h-5" style={{ color: "hsl(var(--accent))" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>{t("address.use_current_location") || "Use current location"}</p>
                <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{t("address.detect_gps") || "Detect via GPS automatically"}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--muted-foreground))" }} />
            </motion.button>
          )}

          {(home?.address || work?.address) && (
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2 px-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                {t("address.saved_places") || "Saved places"}
              </p>
              <div className="space-y-1.5">
                {home?.address && (
                  <SavedPlaceRow
                    icon={<Home className="w-4 h-4" style={{ color: "hsl(var(--accent))" }} />}
                    label={t("address.home") || "Home"}
                    address={home.address}
                    onClick={() => handleSavedSelect(home)}
                    delay={0.05}
                  />
                )}
                {work?.address && (
                  <SavedPlaceRow
                    icon={<Briefcase className="w-4 h-4" style={{ color: "hsl(var(--foreground) / 0.7)" }} />}
                    label={t("address.work") || "Work"}
                    address={work.address}
                    onClick={() => handleSavedSelect(work)}
                    delay={0.1}
                  />
                )}
              </div>
            </div>
          )}

          {recents.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2 px-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                {t("address.recent") || "Recent"}
              </p>
              <div className="space-y-1">
                {recents.slice(0, 6).map((r, i) => (
                  <SavedPlaceRow
                    key={r.id}
                    icon={<Clock className="w-4 h-4" style={{ color: "hsl(var(--muted-foreground))" }} />}
                    label={r.label}
                    address={r.address}
                    onClick={() => handleSavedSelect(r)}
                    delay={0.05 + i * 0.03}
                  />
                ))}
              </div>
            </div>
          )}

          {!home?.address && !work?.address && recents.length === 0 && (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <MapPin className="h-8 w-8 mb-3 opacity-20" style={{ color: "hsl(var(--muted-foreground))" }} />
              <p className="text-sm font-medium break-words" style={{ color: "hsl(var(--muted-foreground))" }}>{t("address.search_or_gps") || "Search or use GPS above"}</p>
              <p className="mt-1 text-xs leading-relaxed break-words" style={{ color: "hsl(var(--muted-foreground) / 0.7)" }}>{t("address.recent_will_appear") || "Your recent addresses will appear here"}</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SavedPlaceRow({
  icon,
  label,
  address,
  onClick,
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  address: string;
  onClick: () => void;
  delay?: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.15 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl active:scale-[0.98] transition-all text-left"
      style={{ background: "transparent" }}
    >
      <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--muted) / 0.4)" }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>{label}</p>
        <p className="text-xs mt-0.5 line-clamp-2 break-words leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>{address}</p>
      </div>
      <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }} />
    </motion.button>
  );
}
