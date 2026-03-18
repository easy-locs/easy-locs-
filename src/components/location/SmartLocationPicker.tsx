/**
 * SmartLocationPicker — 1-tap address selection with Current/Home/Work/Recent/Favorites.
 * Used in /ride, /send, and delivery checkout.
 */
import { useState } from "react";
import { MapPin, Navigation, Home, Briefcase, Star, Clock, ChevronRight, Search, Plus, Settings2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { type SavedPlace } from "@/hooks/useSmartLocation";
import AddressAutocomplete from "@/components/ui/AddressAutocomplete";
import SavedPlaceEditor from "@/components/location/SavedPlaceEditor";

interface SmartLocationPickerProps {
  label: string;
  value: string;
  onSelect: (place: SavedPlace) => void;
  currentLocation: SavedPlace | null;
  savedPlaces: SavedPlace[];
  onSavePlace?: (place: Omit<SavedPlace, "id"> & { id?: string }) => void;
  onRemovePlace?: (id: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

const TYPE_ICONS: Record<string, typeof Home> = {
  home: Home,
  work: Briefcase,
  favorite: Star,
  recent: Clock,
};

export default function SmartLocationPicker({
  label,
  value,
  onSelect,
  currentLocation,
  savedPlaces,
  onSavePlace,
  onRemovePlace,
  placeholder = "Where to?",
  autoFocus = false,
}: SmartLocationPickerProps) {
  const [expanded, setExpanded] = useState(autoFocus);
  const [searchMode, setSearchMode] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const handleQuickSelect = (place: SavedPlace) => {
    onSelect(place);
    setExpanded(false);
    setSearchMode(false);
  };

  const configured = savedPlaces.filter(p => !!p.address);

  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>

      {/* Collapsed state — shows selected address */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/20 active:scale-[0.98] transition-all text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {value || placeholder}
            </p>
            {value && <p className="text-[10px] text-muted-foreground">Tap to change</p>}
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
        </button>
      )}

      {/* Expanded state — quick picks + search */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-border/20 bg-card p-3 space-y-2">
              {/* Quick picks */}
              {!searchMode && (
                <div className="space-y-1">
                  {/* Current location */}
                  {currentLocation && (
                    <button
                      onClick={() => handleQuickSelect(currentLocation)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 active:scale-[0.98] transition-all text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                        <Navigation className="h-3.5 w-3.5 text-success" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">Current Location</p>
                        <p className="text-[10px] text-muted-foreground truncate">{currentLocation.address}</p>
                      </div>
                    </button>
                  )}

                  {/* Saved places */}
                  {configured.map(place => {
                    const Icon = TYPE_ICONS[place.type] || MapPin;
                    return (
                      <button
                        key={place.id}
                        onClick={() => handleQuickSelect(place)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 active:scale-[0.98] transition-all text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                          <Icon className="h-3.5 w-3.5 text-foreground/70" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground">{place.label}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{place.address}</p>
                        </div>
                      </button>
                    );
                  })}

                  {/* Search button */}
                  <button
                    onClick={() => setSearchMode(true)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 active:scale-[0.98] transition-all text-left border border-dashed border-border/30"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                      <Search className="h-3.5 w-3.5 text-primary/60" />
                    </div>
                    <p className="text-xs text-muted-foreground">Search an address…</p>
                  </button>
                </div>
              )}

              {/* Search mode — autocomplete */}
              {searchMode && (
                <div className="space-y-2">
                  <AddressAutocomplete
                    value={value}
                    onChange={() => {}}
                    onSelect={(result) => {
                      const place: SavedPlace = {
                        id: `search-${Date.now()}`,
                        label: result.city || result.label.split(",")[0] || "Address",
                        type: "recent",
                        address: result.label,
                        city: result.city,
                        lat: result.lat,
                        lng: result.lng,
                        icon: "📍",
                      };
                      handleQuickSelect(place);
                    }}
                    placeholder={placeholder}
                  />
                  <button
                    onClick={() => setSearchMode(false)}
                    className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Back to saved places
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
