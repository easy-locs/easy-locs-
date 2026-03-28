/**
 * ChatLocationPicker — Send location, live location, or a place from within chat.
 * WhatsApp-style location sharing with map preview.
 */
import { useState, useCallback } from "react";
import { MapPin, Navigation, Clock, Search, X, Loader2, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { haptic } from "@/lib/haptics";

interface LocationData {
  type: "current" | "live" | "place";
  lat: number;
  lng: number;
  label?: string;
  address?: string;
  duration?: number; // minutes for live location
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSend: (location: LocationData) => void;
}

const LIVE_DURATIONS = [
  { value: 15, label: "15 min" },
  { value: 60, label: "1 hour" },
  { value: 480, label: "8 hours" },
];

export default function ChatLocationPicker({ open, onClose, onSend }: Props) {
  const [tab, setTab] = useState<"current" | "live" | "place">("current");
  const [loading, setLoading] = useState(false);
  const [liveDuration, setLiveDuration] = useState(15);
  const [placeSearch, setPlaceSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ name: string; lat: number; lng: number; address: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);

  const getCurrentPosition = useCallback(async (): Promise<{ lat: number; lng: number }> => {
    const { requestLocation } = await import("@/lib/location/requestLocation");
    const pos = await requestLocation();
    if (!pos) throw new Error("Location unavailable");
    setCurrentPos(pos);
    return pos;
  }, []);

  const handleSendCurrent = useCallback(async () => {
    haptic("medium");
    setLoading(true);
    try {
      const pos = currentPos || await getCurrentPosition();
      onSend({ type: "current", lat: pos.lat, lng: pos.lng, label: "📍 My location" });
      onClose();
    } catch (err: any) {
      const code = err?.code;
      if (code === 1) {
        import("sonner").then(({ toast }) => toast.error("Location permission denied. Please enable it in your browser settings."));
      } else if (code === 2) {
        import("sonner").then(({ toast }) => toast.error("Could not determine your position. Please try again."));
      } else if (code === 3) {
        import("sonner").then(({ toast }) => toast.error("Location request timed out. Check your GPS signal."));
      } else {
        import("sonner").then(({ toast }) => toast.error("Failed to get location."));
      }
    }
    setLoading(false);
  }, [currentPos, getCurrentPosition, onSend, onClose]);

  const handleSendLive = useCallback(async () => {
    haptic("medium");
    setLoading(true);
    try {
      const pos = currentPos || await getCurrentPosition();
      onSend({ type: "live", lat: pos.lat, lng: pos.lng, label: "📡 Live location", duration: liveDuration });
      onClose();
    } catch (err: any) {
      const code = err?.code;
      if (code === 1) {
        import("sonner").then(({ toast }) => toast.error("Location permission denied."));
      } else {
        import("sonner").then(({ toast }) => toast.error("Failed to get location. Please try again."));
      }
    }
    setLoading(false);
  }, [currentPos, getCurrentPosition, liveDuration, onSend, onClose]);

  const handleSearchPlaces = useCallback(async () => {
    if (!placeSearch.trim()) return;
    setSearching(true);
    try {
      // Use Nominatim for free place search
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeSearch)}&limit=5`,
        { signal: AbortSignal.timeout(5000) }
      );
      const data = await res.json();
      setSearchResults(
        data.map((r: any) => ({
          name: r.display_name?.split(",")[0] || r.display_name,
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
          address: r.display_name,
        }))
      );
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  }, [placeSearch]);

  const handleSendPlace = useCallback((place: { name: string; lat: number; lng: number; address: string }) => {
    haptic("medium");
    onSend({ type: "place", lat: place.lat, lng: place.lng, label: place.name, address: place.address });
    onClose();
  }, [onSend, onClose]);

  const tabs = [
    { id: "current" as const, icon: MapPin, label: "Current" },
    { id: "live" as const, icon: Navigation, label: "Live" },
    { id: "place" as const, icon: Building2, label: "Place" },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden" style={{
        background: "hsl(var(--hud-bg))",
        border: "1px solid hsl(var(--hud-border) / 0.2)",
      }}>
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-base" style={{ color: "hsl(var(--hud-text))" }}>
            📍 Share Location
          </DialogTitle>
          <DialogDescription className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>
            Send your position or find a place
          </DialogDescription>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex gap-1 px-4 pb-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); haptic("light"); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                tab === t.id ? "" : "hover:opacity-80"
              }`}
              style={{
                background: tab === t.id ? "hsl(var(--hud-cyan) / 0.15)" : "hsl(var(--hud-surface))",
                color: tab === t.id ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim))",
                border: `1px solid ${tab === t.id ? "hsl(var(--hud-cyan) / 0.3)" : "hsl(var(--hud-border) / 0.1)"}`,
              }}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Map preview */}
        <div className="mx-4 rounded-xl overflow-hidden relative" style={{
          height: 160,
          border: "1px solid hsl(var(--hud-border) / 0.1)",
        }}>
          {currentPos ? (
            <iframe
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${currentPos.lng - 0.01},${currentPos.lat - 0.008},${currentPos.lng + 0.01},${currentPos.lat + 0.008}&layer=mapnik&marker=${currentPos.lat},${currentPos.lng}`}
              className="w-full h-full border-0"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: "hsl(var(--hud-surface))" }}>
              <button
                onClick={() => getCurrentPosition().catch(() => {})}
                className="flex flex-col items-center gap-2 text-xs"
                style={{ color: "hsl(var(--hud-cyan))" }}
              >
                <Navigation className="h-6 w-6" />
                Tap to detect position
              </button>
            </div>
          )}
          {/* Pulse indicator */}
          {currentPos && tab === "live" && (
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full" style={{
              background: "hsl(var(--hud-success) / 0.2)",
              border: "1px solid hsl(var(--hud-success) / 0.4)",
            }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "hsl(var(--hud-success))" }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "hsl(var(--hud-success))" }} />
              </span>
              <span className="text-[10px] font-medium" style={{ color: "hsl(var(--hud-success))" }}>LIVE</span>
            </div>
          )}
        </div>

        {/* Tab content */}
        <div className="px-4 py-3">
          {tab === "current" && (
            <Button
              onClick={handleSendCurrent}
              disabled={loading}
              className="w-full gap-2"
              style={{
                background: "hsl(var(--hud-cyan) / 0.15)",
                color: "hsl(var(--hud-cyan))",
                border: "1px solid hsl(var(--hud-cyan) / 0.3)",
              }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              Send current location
            </Button>
          )}

          {tab === "live" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                {LIVE_DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => { setLiveDuration(d.value); haptic("light"); }}
                    className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: liveDuration === d.value ? "hsl(var(--hud-cyan) / 0.15)" : "hsl(var(--hud-surface))",
                      color: liveDuration === d.value ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim))",
                      border: `1px solid ${liveDuration === d.value ? "hsl(var(--hud-cyan) / 0.3)" : "hsl(var(--hud-border) / 0.1)"}`,
                    }}
                  >
                    <Clock className="h-3 w-3 inline mr-1" />
                    {d.label}
                  </button>
                ))}
              </div>
              <Button
                onClick={handleSendLive}
                disabled={loading}
                className="w-full gap-2"
                style={{
                  background: "hsl(var(--hud-success) / 0.15)",
                  color: "hsl(var(--hud-success))",
                  border: "1px solid hsl(var(--hud-success) / 0.3)",
                }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                Share live location · {LIVE_DURATIONS.find(d => d.value === liveDuration)?.label}
              </Button>
            </div>
          )}

          {tab === "place" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={placeSearch}
                  onChange={(e) => setPlaceSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchPlaces()}
                  placeholder="Search a place..."
                  className="text-sm"
                  style={{
                    background: "hsl(var(--hud-surface))",
                    borderColor: "hsl(var(--hud-border) / 0.15)",
                    color: "hsl(var(--hud-text))",
                  }}
                />
                <Button
                  onClick={handleSearchPlaces}
                  disabled={searching}
                  size="icon"
                  className="shrink-0"
                  style={{ background: "hsl(var(--hud-cyan) / 0.15)", color: "hsl(var(--hud-cyan))" }}
                >
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {searchResults.map((place, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendPlace(place)}
                    className="w-full text-left p-2.5 rounded-lg transition-colors hover:opacity-90"
                    style={{
                      background: "hsl(var(--hud-surface))",
                      border: "1px solid hsl(var(--hud-border) / 0.08)",
                    }}
                  >
                    <p className="text-sm font-medium line-clamp-1 break-words" style={{ color: "hsl(var(--hud-text))" }}>
                      {place.name}
                    </p>
                    <p className="text-[11px] line-clamp-1 break-words mt-0.5" style={{ color: "hsl(var(--hud-text-dim))" }}>
                      {place.address}
                    </p>
                  </button>
                ))}
                {searchResults.length === 0 && placeSearch && !searching && (
                  <p className="text-xs text-center py-4" style={{ color: "hsl(var(--hud-text-dim))" }}>
                    No results found
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
