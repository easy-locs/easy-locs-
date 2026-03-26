/**
 * AddressSelectorSheet — Canonical inline address selector.
 * Replaces all navigate("/address") calls with a reliable bottom sheet.
 * Connects selection → active context → radar → ETA → merchant refresh.
 */
import { useState, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CanonicalAddressInput } from "@/components/address/CanonicalAddressInput";
import { useLocationStore } from "@/stores/locationStore";
import { useRadarPlaceStore } from "@/stores/radarPlaceStore";
import { eventBus } from "@/lib/core/event-bus";
import { computeZoneKey, type CanonicalPlace } from "@/lib/address/canonical-place";
import { MapPin, Navigation } from "lucide-react";
import { geoService } from "@/lib/geo/geo-service";

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

    const { lat, lng } = place;
    if (!lat || !lng) return;

    const label = place.label ?? place.formatted_address ?? "";

    // 1. Update locationStore
    useLocationStore.getState().setSelectedLocation({
      lat, lng, label,
      city: place.city ?? undefined,
      area: place.district ?? undefined,
      country: place.country_name ?? undefined,
    });
    useLocationStore.getState().setMapViewport({ lat, lng }, 14);

    // 2. Add to recent places
    useLocationStore.getState().addRecentPlace({
      lat, lng, label,
      city: place.city ?? undefined,
      area: place.district ?? undefined,
      country: place.country_name ?? undefined,
    });

    // 3. Update radarPlaceStore for radar sync
    const zoneKey = place.zone_key ?? computeZoneKey(
      place.country_code ?? "AE",
      place.city ?? undefined,
      place.district ?? undefined,
    );
    useRadarPlaceStore.getState().setSelectedPlace({
      lat, lng, label,
      zone_key: zoneKey,
      canonical_place_id: place.id ?? "",
      formatted_address: place.formatted_address ?? label,
      place_type: place.place_type ?? "address",
      viewport: null,
      overlay: null,
    });

    // 4. Emit canonical events to refresh entire execution chain
    eventBus.emit("address.context.updated", {
      userId: "anonymous",
      contextType,
      lat, lng,
      sourceType: "manual",
      canonicalPlaceId: place.id ?? null,
      zoneKey,
    });
    eventBus.emit("radar.context.refresh", { userId: "anonymous", zoneKey });
    eventBus.emit("eta.context.refresh", { userId: "anonymous", contextType });
    eventBus.emit("merchant.visibility.refresh", { zoneKey });

    // 5. Close sheet
    onOpenChange(false);
  }, [contextType, onOpenChange]);

  const handleUseGPS = useCallback(() => {
    geoService.forceRetry();
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
          {/* GPS button */}
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

          {/* Canonical address search */}
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
