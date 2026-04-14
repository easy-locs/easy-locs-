/**
 * BubbleLocationBlock — Clickable location preview card in message bubbles.
 * Uses Mapbox static map API for fast, crisp previews.
 * Tapping opens the canonical LocationViewer. "Open in Maps" opens external.
 */
import { memo, useCallback } from "react";
import { MapPin, ExternalLink, Navigation } from "lucide-react";
import { useLocationViewer } from "@/families/location";
import { useInAppNavigation } from "@/stores/useInAppNavigation";
import { MAPBOX_ACCESS_TOKEN } from "@/lib/mapbox/config";

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
  const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s+e74c3c(${lng},${lat})/${lng},${lat},15,0/300x140@2x?access_token=${MAPBOX_ACCESS_TOKEN}`;

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
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: "hsl(var(--primary) / 0.9)", color: "hsl(var(--primary-foreground))" }}>
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
        <span className="text-[12.5px] flex-1 font-medium" style={{ color: "hsl(var(--foreground))" }}>
          {label || (isLive ? "📡 Live location" : "📍 Location")}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="flex items-center gap-1.5 text-[11px] font-medium hover:opacity-80 transition-opacity"
          style={{ color: "hsl(var(--primary))" }}
          onClick={(e) => { e.stopPropagation(); handleTap(); }}
        >
          <MapPin className="h-3 w-3" />
          View Map
        </button>
        <button
          className="flex items-center gap-1.5 text-[11px] font-medium hover:opacity-80 transition-opacity"
          style={{ color: "hsl(var(--primary))" }}
          onClick={handleNavigate}
        >
          <Navigation className="h-3 w-3" />
          Directions
        </button>
        <a
          href={`https://www.google.com/maps?q=${lat},${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[11px] font-medium hover:opacity-80 transition-opacity"
          style={{ color: "hsl(var(--muted-foreground))" }}
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3 w-3" />
          Open in Maps
        </a>
      </div>
    </div>
  );
}

export const BubbleLocationBlock = memo(BubbleLocationBlockInner);
BubbleLocationBlock.displayName = "BubbleLocationBlock";
