/**
 * AddressSelectorSheet — Canonical inline address selector.
 * Uses GEO BRAIN as single source of truth for address operations.
 */
import { useState, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CanonicalAddressInput } from "@/components/address/CanonicalAddressInput";
import { useLocationStore } from "@/stores/locationStore";
import { setAddressFromPlace, requestGPS } from "@/lib/brain/geo-brain";
import type { CanonicalPlace } from "@/lib/address/canonical-place";
import { MapPin, Navigation } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contextType?: string;
}

export function AddressSelectorSheet({ open, onOpenChange, contextType = "global" }: Props) {
  const [selected, setSelected] = useState<CanonicalPlace | null>(null);
  const permissionState = useLocationStore((s) => s.permissionState);

  const handlePlaceSelect = useCallback((place: CanonicalPlace | null) => {
    if (!place) return;
    setSelected(place);
    // Delegate entirely to Geo Brain
    setAddressFromPlace(place);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleUseGPS = useCallback(() => {
    requestGPS();
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85dvh] overflow-y-auto">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Set delivery address
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pb-6">
          {permissionState !== "denied" && (
            <button
              onClick={handleUseGPS}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
            >
              <Navigation className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Use current location</p>
                <p className="text-xs text-muted-foreground">Detect via GPS automatically</p>
              </div>
            </button>
          )}

          <CanonicalAddressInput
            value={selected}
            onChange={handlePlaceSelect}
            placeholder="Search for a place, tower, mall, landmark..."
            contextType={contextType as any}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
