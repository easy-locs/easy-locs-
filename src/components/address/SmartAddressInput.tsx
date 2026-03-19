/**
 * SmartAddressInput — Uber/Careem-style address picker.
 * Shows current location, Home, Work, recents, and search results.
 */
import React, { useState, useCallback, memo } from "react";
import { useAddressEngine } from "@/hooks/useAddressEngine";
import type { ResolvedAddress } from "@/lib/address/address-engine";
import { MapPin, Home, Briefcase, Clock, Search, Navigation, Loader2, Star } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Props {
  onSelect: (address: ResolvedAddress) => void;
  placeholder?: string;
  label?: string;
  showSaveOptions?: boolean;
}

const AddressRow = memo(function AddressRow({
  address,
  icon,
  onSelect,
}: {
  address: ResolvedAddress;
  icon: React.ReactNode;
  onSelect: (a: ResolvedAddress) => void;
}) {
  return (
    <button
      onClick={() => onSelect(address)}
      className="flex items-start gap-3 w-full px-3 py-2.5 text-left rounded-xl hover:bg-muted/60 active:bg-muted transition-colors"
    >
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">
          {address.title || address.label || address.building || "Address"}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {address.fullAddress}
        </p>
      </div>
    </button>
  );
});

function SmartAddressInput({ onSelect, placeholder = "Where to?", label, showSaveOptions }: Props) {
  const {
    bestAddress,
    savedAddresses,
    searchResults,
    searching,
    loading,
    statusText,
    home,
    work,
    geo,
    search,
    selectAddress,
  } = useAddressEngine();

  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);
      search(value);
    },
    [search]
  );

  const handleSelect = useCallback(
    (addr: ResolvedAddress) => {
      selectAddress(addr);
      onSelect(addr);
      setQuery("");
      setFocused(false);
    },
    [selectAddress, onSelect]
  );

  const iconForSource = (source: string) => {
    switch (source) {
      case "default": return <Star className="h-4 w-4" />;
      case "current_location": return <Navigation className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const showDropdown = focused || query.length > 0;

  return (
    <div className="relative w-full">
      {label && (
        <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query || (bestAddress && !focused ? bestAddress.fullAddress : "")}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => { setFocused(true); setQuery(""); }}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder={placeholder}
          className="pl-9 pr-4 h-11 rounded-xl bg-muted/50 border-border/50"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Status */}
      {!showDropdown && loading && (
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> {statusText}
        </p>
      )}
      {!showDropdown && !loading && bestAddress && (
        <p className="text-xs text-muted-foreground mt-1">{statusText}</p>
      )}

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-2xl border border-border bg-card shadow-xl max-h-72 overflow-y-auto">
          {/* Current location */}
          {geo.lat && geo.lng && (
            <AddressRow
              address={{
                label: "Current Location",
                fullAddress: geo.effectiveCity || "Your location",
                city: geo.effectiveCity || "Dubai",
                lat: geo.lat,
                lng: geo.lng,
                source: "current_location",
              }}
              icon={<Navigation className="h-4 w-4 text-primary" />}
              onSelect={handleSelect}
            />
          )}

          {/* Home / Work */}
          {home && home.fullAddress && (
            <AddressRow
              address={home}
              icon={<Home className="h-4 w-4 text-emerald-500" />}
              onSelect={handleSelect}
            />
          )}
          {work && work.fullAddress && (
            <AddressRow
              address={work}
              icon={<Briefcase className="h-4 w-4 text-blue-500" />}
              onSelect={handleSelect}
            />
          )}

          {/* Search results */}
          {query.length > 0 && searchResults.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Results
              </div>
              {searchResults.map((r) => (
                <AddressRow
                  key={r.id || r.fullAddress}
                  address={r}
                  icon={<MapPin className="h-4 w-4" />}
                  onSelect={handleSelect}
                />
              ))}
            </>
          )}

          {/* Saved / recent addresses */}
          {query.length === 0 && savedAddresses.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Saved places
              </div>
              {savedAddresses
                .filter((a) => a.label?.toLowerCase() !== "home" && a.label?.toLowerCase() !== "work")
                .slice(0, 5)
                .map((a) => (
                  <AddressRow
                    key={a.id || a.fullAddress}
                    address={a}
                    icon={iconForSource(a.source)}
                    onSelect={handleSelect}
                  />
                ))}
            </>
          )}

          {/* No results */}
          {query.length > 0 && !searching && searchResults.length === 0 && (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              No addresses found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(SmartAddressInput);
