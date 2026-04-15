/**
 * ChatLocationPicker — Send location, live location, or a place from within chat.
 * WhatsApp-style location sharing with map preview + reverse geocoding for address/building.
 */
import { useState, useCallback, useEffect } from "react";
import { MapPin, Navigation, Clock, Search, X, Loader2, Building2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { haptic } from "@/lib/haptics";
import { MAPBOX_ACCESS_TOKEN } from "@/lib/mapbox/config";

interface LocationData {
  type: "current" | "live" | "place";
  lat: number;
  lng: number;
  label?: string;
  address?: string;
  building?: string;
  duration?: number;
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

interface ReverseGeoResult {
  label: string;
  address: string;
  building?: string;
}

async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeoResult> {
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=poi,address&limit=1`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) return { label: "📍 My location", address: "" };

    const placeName = feature.place_name || "";
    const textLabel = feature.text || placeName.split(",")[0] || "📍 My location";
    const poiCategory = feature.properties?.category || "";
    const building = poiCategory ? textLabel : undefined;

    return {
      label: textLabel,
      address: placeName,
      building,
    };
  } catch {
    return { label: "📍 My location", address: "" };
  }
}

export default function ChatLocationPicker({ open, onClose, onSend }: Props) {
  const [tab, setTab] = useState<"current" | "live" | "place">("current");
  const [loading, setLoading] = useState(false);
  const [liveDuration, setLiveDuration] = useState(15);
  const [placeSearch, setPlaceSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ name: string; lat: number; lng: number; address: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoResult, setGeoResult] = useState<ReverseGeoResult | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrentPos(null);
      setGeoResult(null);
      setTab("current");
      setPlaceSearch("");
      setSearchResults([]);
      getCurrentPosition().catch(() => {});
    }
  }, [open]);

  const getCurrentPosition = useCallback(async (): Promise<{ lat: number; lng: number }> => {
    const { requestLocation } = await import("@/lib/location/requestLocation");
    const pos = await requestLocation();
    if (!pos) throw new Error("Location unavailable");
    setCurrentPos(pos);
    return pos;
  }, []);

  useEffect(() => {
    if (!currentPos) return;
    let cancelled = false;
    setGeoLoading(true);
    reverseGeocode(currentPos.lat, currentPos.lng).then((result) => {
      if (!cancelled) {
        setGeoResult(result);
        setGeoLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [currentPos?.lat, currentPos?.lng]);

  const handleSendCurrent = useCallback(async () => {
    haptic("medium");
    setLoading(true);
    try {
      const pos = currentPos || await getCurrentPosition();
      const geo = geoResult || await reverseGeocode(pos.lat, pos.lng);
      onSend({
        type: "current",
        lat: pos.lat,
        lng: pos.lng,
        label: geo.label || "📍 My location",
        address: geo.address,
        building: geo.building,
      });
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
  }, [currentPos, getCurrentPosition, geoResult, onSend, onClose]);

  const handleSendLive = useCallback(async () => {
    haptic("medium");
    setLoading(true);
    try {
      const pos = currentPos || await getCurrentPosition();
      const geo = geoResult || await reverseGeocode(pos.lat, pos.lng);
      onSend({
        type: "live",
        lat: pos.lat,
        lng: pos.lng,
        label: `📡 Live location · ${geo.label || ""}`.trim(),
        address: geo.address,
        building: geo.building,
        duration: liveDuration,
      });
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
  }, [currentPos, getCurrentPosition, liveDuration, geoResult, onSend, onClose]);

  const handleSearchPlaces = useCallback(async () => {
    if (!placeSearch.trim()) return;
    setSearching(true);
    try {
      const proximity = currentPos ? `&proximity=${currentPos.lng},${currentPos.lat}` : "";
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(placeSearch)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=5${proximity}`,
        { signal: AbortSignal.timeout(5000) }
      );
      const data = await res.json();
      setSearchResults(
        (data.features || []).map((f: any) => ({
          name: f.text || f.place_name?.split(",")[0] || f.place_name,
          lat: f.center[1],
          lng: f.center[0],
          address: f.place_name || "",
        }))
      );
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  }, [placeSearch, currentPos]);

  const handleSendPlace = useCallback((place: { name: string; lat: number; lng: number; address: string }) => {
    haptic("medium");
    onSend({ type: "place", lat: place.lat, lng: place.lng, label: place.name, address: place.address });
    onClose();
  }, [onSend, onClose]);

  const { t } = useI18n();
  const tabs = [
    { id: "current" as const, icon: MapPin, label: t("orbit.loc_current") },
    { id: "live" as const, icon: Navigation, label: t("orbit.loc_live") },
    { id: "place" as const, icon: Building2, label: t("orbit.loc_place") },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden" style={{
        background: "hsl(var(--background))",
        border: "1px solid hsl(var(--border) / 0.2)",
      }}>
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-base" style={{ color: "hsl(var(--foreground))" }}>
            📍 {t("orbit.loc_share_title")}
          </DialogTitle>
          <DialogDescription className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
            {t("orbit.loc_send_current")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 px-4 pb-3">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              onClick={() => { setTab(tb.id); haptic("light"); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                tab === tb.id ? "" : "hover:opacity-80"
              }`}
              style={{
                background: tab === tb.id ? "hsl(var(--primary) / 0.15)" : "hsl(var(--card))",
                color: tab === tb.id ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                border: `1px solid ${tab === tb.id ? "hsl(var(--primary) / 0.3)" : "hsl(var(--border) / 0.1)"}`,
              }}
            >
              <tb.icon className="h-3.5 w-3.5" />
              {tb.label}
            </button>
          ))}
        </div>

        <div className="mx-4 rounded-xl overflow-hidden relative" style={{
          height: 160,
          border: "1px solid hsl(var(--border) / 0.1)",
        }}>
          {currentPos ? (
            <img
              src={`https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s+3b82f6(${currentPos.lng},${currentPos.lat})/${currentPos.lng},${currentPos.lat},15,0/400x160@2x?access_token=${MAPBOX_ACCESS_TOKEN}`}
              alt="Your location"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: "hsl(var(--card))" }}>
              <button
                onClick={() => getCurrentPosition().catch(() => {})}
                className="flex flex-col items-center gap-2 text-xs"
                style={{ color: "hsl(var(--primary))" }}
              >
                <Navigation className="h-6 w-6" />
                {t("orbit.loc_detect")}
              </button>
            </div>
          )}
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

        {currentPos && (tab === "current" || tab === "live") && (
          <div className="mx-4 mt-2 px-3 py-2 rounded-lg" style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border) / 0.08)",
          }}>
            {geoLoading ? (
              <div className="flex items-center gap-2 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                <Loader2 className="h-3 w-3 animate-spin" />
                {t("orbit.loc_fetching")}
              </div>
            ) : geoResult ? (
              <div>
                <p className="text-xs font-semibold truncate" style={{ color: "hsl(var(--foreground))" }}>
                  {geoResult.building ? `🏢 ${geoResult.building}` : `📍 ${geoResult.label}`}
                </p>
                <p className="text-[10px] truncate mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {geoResult.address}
                </p>
              </div>
            ) : (
              <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                {currentPos.lat.toFixed(6)}, {currentPos.lng.toFixed(6)}
              </p>
            )}
          </div>
        )}

        <div className="px-4 py-3">
          {tab === "current" && (
            <Button
              onClick={handleSendCurrent}
              disabled={loading}
              className="w-full gap-2"
              style={{
                background: "hsl(var(--primary) / 0.15)",
                color: "hsl(var(--primary))",
                border: "1px solid hsl(var(--primary) / 0.3)",
              }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              {t("orbit.loc_send_current")}
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
                      background: liveDuration === d.value ? "hsl(var(--primary) / 0.15)" : "hsl(var(--card))",
                      color: liveDuration === d.value ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                      border: `1px solid ${liveDuration === d.value ? "hsl(var(--primary) / 0.3)" : "hsl(var(--border) / 0.1)"}`,
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
                {t("orbit.loc_live_sharing")} · {LIVE_DURATIONS.find(d => d.value === liveDuration)?.label}
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
                  placeholder={t("orbit.loc_search_nearby")}
                  className="text-sm"
                  style={{
                    background: "hsl(var(--card))",
                    borderColor: "hsl(var(--border) / 0.15)",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Button
                  onClick={handleSearchPlaces}
                  disabled={searching}
                  size="icon"
                  className="shrink-0"
                  style={{ background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))" }}
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
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border) / 0.08)",
                    }}
                  >
                    <p className="text-sm font-medium line-clamp-1 break-words" style={{ color: "hsl(var(--foreground))" }}>
                      {place.name}
                    </p>
                    <p className="text-[11px] line-clamp-2 break-words mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                      {place.address}
                    </p>
                  </button>
                ))}
                {searchResults.length === 0 && placeSearch && !searching && (
                  <p className="text-xs text-center py-4" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {t("common.no_data")}
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
