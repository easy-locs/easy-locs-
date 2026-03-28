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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contextType?: string;
}

export function AddressSelectorSheet({ open, onOpenChange, contextType = "global" }: Props) {
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
        className="h-[92dvh] rounded-t-3xl p-0 flex flex-col overflow-hidden border-t border-border/20"
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <MapPin className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-foreground tracking-tight break-words">Delivery address</h2>
              <p className="text-[11px] leading-relaxed text-muted-foreground break-words text-balance-soft">Where should we deliver?</p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 shrink-0 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* ── Search ── */}
        <div className="px-5 pb-3">
          <CanonicalAddressInput
            value={selected}
            onChange={handlePlaceSelect}
            placeholder="Search for a place, tower, mall, landmark..."
            contextType={contextType as any}
            allowSavedPlaces={false}
            className="w-full"
          />
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-[env(safe-area-inset-bottom,24px)]">
          {/* GPS Button */}
          {permissionState !== "denied" && (
            <motion.button
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleUseGPS}
              className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border border-primary/15 bg-primary/5 hover:bg-primary/10 active:scale-[0.98] transition-all text-left mb-4"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Navigation className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Use current location</p>
                <p className="text-xs text-muted-foreground mt-0.5">Detect via GPS automatically</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </motion.button>
          )}

          {/* Saved places */}
          {(home?.address || work?.address) && (
            <div className="mb-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                Saved places
              </p>
              <div className="space-y-1.5">
                {home?.address && (
                  <SavedPlaceRow
                    icon={<Home className="w-4 h-4 text-primary" />}
                    label="Home"
                    address={home.address}
                    onClick={() => handleSavedSelect(home)}
                    delay={0.05}
                  />
                )}
                {work?.address && (
                  <SavedPlaceRow
                    icon={<Briefcase className="w-4 h-4 text-accent-foreground" />}
                    label="Work"
                    address={work.address}
                    onClick={() => handleSavedSelect(work)}
                    delay={0.1}
                  />
                )}
              </div>
            </div>
          )}

          {/* Recent places */}
          {recents.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                Recent
              </p>
              <div className="space-y-1">
                {recents.slice(0, 6).map((r, i) => (
                  <SavedPlaceRow
                    key={r.id}
                    icon={<Clock className="w-4 h-4 text-muted-foreground" />}
                    label={r.label}
                    address={r.address}
                    onClick={() => handleSavedSelect(r)}
                    delay={0.05 + i * 0.03}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!home?.address && !work?.address && recents.length === 0 && (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center text-muted-foreground">
              <MapPin className="h-8 w-8 mb-3 opacity-20" />
              <p className="text-sm font-medium break-words text-balance-soft">Search or use GPS above</p>
              <p className="mt-1 text-xs leading-relaxed break-words text-balance-soft">Your recent addresses will appear here</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ── Saved Place Row ── */
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
      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-muted/50 active:scale-[0.98] transition-all text-left"
    >
      <div className="shrink-0 w-9 h-9 rounded-xl bg-muted/40 flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 break-words leading-relaxed">{address}</p>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
    </motion.button>
  );
}
