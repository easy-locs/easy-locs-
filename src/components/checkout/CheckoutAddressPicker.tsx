/**
 * CheckoutAddressPicker — Rewired to canonical address pipeline.
 * Uses useCanonicalAddress + CanonicalAddressInput.
 */
import { useState, useMemo } from "react";
import { useCanonicalAddress } from "@/hooks/useCanonicalAddress";
import { CanonicalAddressInput } from "@/components/address/CanonicalAddressInput";
import type { CanonicalPlace } from "@/lib/address/canonical-place";

export interface CheckoutAddressValue {
  id: string;
  label: string;
  line1: string;
  city: string;
  area?: string | null;
}

export default function CheckoutAddressPicker({
  value,
  onChange,
}: {
  value: CheckoutAddressValue | null;
  onChange: (value: CheckoutAddressValue | null) => void;
}) {
  const { activeContext, savedAddresses, loading } = useCanonicalAddress("food_delivery");
  const [open, setOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<CanonicalPlace | null>(null);

  const selectedText = useMemo(() => {
    if (selectedPlace) return selectedPlace.label;
    if (value) return `${value.label} · ${value.line1}${value.area ? `, ${value.area}` : ""}`;
    if (activeContext?.city) return `${activeContext.district ?? activeContext.city}`;
    return "Select address";
  }, [value, selectedPlace, activeContext]);

  const handlePlaceChange = (place: CanonicalPlace | null) => {
    setSelectedPlace(place);
    if (place) {
      onChange({
        id: place.id ?? crypto.randomUUID(),
        label: place.label,
        line1: place.formatted_address,
        city: place.city ?? "Dubai",
        area: place.district ?? null,
      });
      setOpen(false);
    } else {
      onChange(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Delivery Address</p>
          <p className="text-sm font-semibold text-foreground min-w-0 break-words leading-snug">{selectedText}</p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-xl bg-muted px-3 py-2 text-xs font-bold"
        >
          {open ? "Close" : "Change"}
        </button>
      </div>

      {open && (
        <div className="pt-2">
          <CanonicalAddressInput
            value={selectedPlace}
            onChange={handlePlaceChange}
            contextType="food_delivery"
            contextLabel="Deliver to"
            placeholder="Search delivery address..."
            allowSavedPlaces
          />
        </div>
      )}
    </div>
  );
}
