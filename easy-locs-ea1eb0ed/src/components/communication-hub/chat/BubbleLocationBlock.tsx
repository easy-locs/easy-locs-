/**
 * BubbleLocationBlock — Clickable location preview card in message bubbles.
 * Uses Mapbox static map API for fast, crisp previews.
 * Tapping opens the canonical LocationViewer. "Navigate" opens in-app navigation.
 */
import { memo, useCallback } from "react";
import { MapPin, Navigation } from "lucide-react";
import { useLocationViewer } from "@/families/location";
import { useInAppNavigation } from "@/stores/useInAppNavigation";

interface Props {
  lat: string;
  lng: string;
  label?: string | null;
  mode?: string;
  messageId?: string;
}

function BubbleLocationBlockInner({ lat, lng, label, mode, messageId }: Props) {
  const openViewer = useLocationViewer((s) => s.openLocation);
  const openNavigation = useInAppNavigation((s) => s.openNavigation);

  const handleTap = useCallback(() => {
    openViewer({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      label: label || undefined,
      mode: (mode as "static" | "live" | "place") || "static",
      messageId,
    });
  }, [lat, lng, label, mode, messageId, openViewer]);

  const handleNavigate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    openNavigation({ lat: parseFloat(lat), lng: parseFloat(lng), label: label || undefined });
  }, [lat, lng, label, openNavigation]);

  const isLive = mode === "live";
  const mapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=600x280&markers=${lat},${lng},ol-marker`;

  return (
    <div className="space-y-1.5 cursor-pointer" onClick={handleTap}>
      <div
        className="rounded-lg overflow-hidden -mx-1 relative"
        style={{ border: "1px solid hsl(var(--border) / 0.15)" }}
      >
        <img
          src={mapUrl}
          alt={label || "Location"}
          className="w-full object-cover"
          style={{ height: 130 }}
          loading="lazy"
        />
        {isLive && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.625rem] font-semibold" style={{ background: "hsl(var(--primary) / 0.9)", color: "hsl(var(--primary-foreground))" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isLive ? (
          <Navigation className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--primary))" }} />
        ) : (
          <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--primary))" }} />
        )}
        <span className="text-[0.78125rem] flex-1 font-medium" style={{ color: "hsl(var(--foreground))" }}>
          {label || (isLive ? "📡 Live location" : "📍 Location")}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="flex items-center gap-1.5 text-[0.6875rem] font-medium hover:opacity-80 transition-opacity"
          style={{ color: "hsl(var(--primary))" }}
          onClick={(e) => { e.stopPropagation(); handleTap(); }}
        >
          <MapPin className="h-3 w-3" />
          View Map
        </button>
        <button
          className="flex items-center gap-1.5 text-[0.6875rem] font-medium hover:opacity-80 transition-opacity"
          style={{ color: "hsl(var(--primary))" }}
          onClick={handleNavigate}
        >
          <Navigation className="h-3 w-3" />
          Navigate
        </button>
      </div>
    </div>
  );
}

export const BubbleLocationBlock = memo(BubbleLocationBlockInner);
BubbleLocationBlock.displayName = "BubbleLocationBlock";
