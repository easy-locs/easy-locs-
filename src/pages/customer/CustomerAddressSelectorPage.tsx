import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCanonicalAddress } from "@/hooks/useCanonicalAddress";
import { CanonicalAddressInput } from "@/components/address/CanonicalAddressInput";
import type { CanonicalPlace } from "@/lib/address/canonical-place";

export default function CustomerAddressSelectorPage() {
  const navigate = useNavigate();
  const { savedAddresses, activateAddress, loading } = useCanonicalAddress("food_delivery");
  const [selectedPlace, setSelectedPlace] = useState<CanonicalPlace | null>(null);

  const save = async () => {
    if (selectedPlace) {
      await activateAddress(selectedPlace, "saved", "food_delivery");
      toast.success("Delivery address selected");
    }
    navigate("/checkout");
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/checkout")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Select Address</h1>
          <p className="text-xs text-muted-foreground">Choose delivery destination</p>
        </div>
      </div>

      <div className="px-4">
        <CanonicalAddressInput
          value={selectedPlace}
          onChange={setSelectedPlace}
          contextType="food_delivery"
          contextLabel="Deliver to"
          placeholder="Search or select address..."
          allowSavedPlaces
        />
      </div>

      {/* Saved addresses list */}
      {savedAddresses.length > 0 && !selectedPlace && (
        <div className="px-4 mt-4 space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Saved Addresses</p>
          {savedAddresses.map((addr) => (
            <button
              key={addr.id}
              onClick={() => {
                if (addr.place) {
                  setSelectedPlace({
                    id: addr.place.id,
                    provider: addr.place.provider,
                    provider_place_id: addr.place.provider_place_id,
                    label: addr.label ?? addr.place.short_label ?? addr.place.formatted_address,
                    formatted_address: addr.place.formatted_address,
                    lat: Number(addr.place.lat),
                    lng: Number(addr.place.lng),
                    country_code: addr.place.country_code,
                    city: addr.place.city,
                    district: addr.place.district,
                    place_type: (addr.place.place_type as any) ?? "address",
                  });
                }
              }}
              className="w-full rounded-2xl border border-border/20 bg-card p-4 text-left transition-transform active:scale-[0.99]"
            >
              <p className="text-sm font-bold text-foreground">{addr.label ?? "Address"}</p>
              <p className="text-xs text-muted-foreground">{addr.place?.formatted_address}</p>
              {addr.apartment && (
                <p className="text-[11px] text-muted-foreground/70">Apt {addr.apartment}{addr.floor ? `, Floor ${addr.floor}` : ""}</p>
              )}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={save}
        disabled={!selectedPlace}
        className="mx-4 mt-4 w-[calc(100%-2rem)] rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold disabled:opacity-50"
      >
        Confirm Address
      </button>
    </div>
  );
}
