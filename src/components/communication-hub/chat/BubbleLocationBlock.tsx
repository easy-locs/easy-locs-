/**
 * BubbleLocationBlock — Clickable location preview card in message bubbles.
 * Tapping opens the canonical LocationViewer. "Open in Maps" opens external.
 * Memoized: only rerenders when coordinates change.
 */
import { memo, useCallback } from "react";
import { MapPin, ExternalLink, Navigation } from "lucide-react";
import { useLocationViewer } from "@/families/location";

interface Props {
  lat: string;
  lng: string;
  label?: string | null;
  mode?: string;
  messageId?: string;
}

function BubbleLocationBlockInner({ lat, lng, label, mode, messageId }: Props) {
  const openViewer = useLocationViewer((s) => s.openLocation);

  const handleTap = useCallback(() => {
    openViewer({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      label: label || undefined,
      mode: (mode as "static" | "live" | "place") || "static",
      messageId,
    });
  }, [lat, lng, label, mode, messageId, openViewer]);

  const isLive = mode === "live";

  return (
    <div className="space-y-1.5 cursor-pointer" onClick={handleTap}>
      {/* Map preview */}
      <div
        className="rounded-lg overflow-hidden -mx-1 relative"
        style={{ border: "1px solid hsl(var(--border) / 0.15)" }}
      >
        <iframe
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(lng) - 0.008},${parseFloat(lat) - 0.006},${parseFloat(lng) + 0.008},${parseFloat(lat) + 0.006}&layer=mapnik&marker=${lat},${lng}`}
          className="w-full border-0 pointer-events-none"
          style={{ height: 130 }}
          loading="lazy"
        />
        {isLive && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/90 text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </div>
        )}
      </div>

      {/* Label */}
      <div className="flex items-center gap-2">
        {isLive ? (
          <Navigation className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
        ) : (
          <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--primary))" }} />
        )}
        <span className="text-[12.5px] flex-1 font-medium" style={{ color: "hsl(var(--foreground))" }}>
          {label || (isLive ? "📡 Live location" : "📍 Location")}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          className="flex items-center gap-1.5 text-[11px] font-medium hover:opacity-80 transition-opacity"
          style={{ color: "hsl(var(--primary))" }}
          onClick={(e) => { e.stopPropagation(); handleTap(); }}
        >
          <MapPin className="h-3 w-3" />
          View Map
        </button>
        <a
          href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`}
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
