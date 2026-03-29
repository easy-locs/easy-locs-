/**
 * BubbleLocationBlock — Isolated location rendering for message bubbles.
 * Memoized: only rerenders when coordinates change.
 */
import { memo } from "react";
import { MapPin, ExternalLink } from "lucide-react";

interface Props {
  lat: string;
  lng: string;
  label?: string | null;
}

function BubbleLocationBlockInner({ lat, lng, label }: Props) {
  return (
    <div className="space-y-1.5">
      <div className="rounded-lg overflow-hidden -mx-1" style={{ border: "1px solid hsl(var(--hud-border) / 0.1)" }}>
        <iframe
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(lng) - 0.008},${parseFloat(lat) - 0.006},${parseFloat(lng) + 0.008},${parseFloat(lat) + 0.006}&layer=mapnik&marker=${lat},${lng}`}
          className="w-full border-0 pointer-events-none"
          style={{ height: 120 }}
          loading="lazy"
        />
      </div>
      <div className="flex items-center gap-2">
        <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--hud-cyan))" }} />
        <span className="text-[12.5px] flex-1" style={{ color: "hsl(var(--foreground))" }}>
          {label || "📍 Location"}
        </span>
      </div>
      <a
        href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-[11px] font-medium hover:opacity-80 transition-opacity"
        style={{ color: "hsl(var(--hud-cyan))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="h-3 w-3" />
        Open in Maps
      </a>
    </div>
  );
}

export const BubbleLocationBlock = memo(BubbleLocationBlockInner);
BubbleLocationBlock.displayName = "BubbleLocationBlock";
