/**
 * LocationCard — Inline location card for static/live location messages.
 * Shows real OpenStreetMap preview when coordinates are available.
 */
import { memo, useState } from "react";
import { MapPin, Navigation, ExternalLink } from "lucide-react";
import type { CanonicalMessageEnvelope } from "@/families/messages/canonical-envelope";

interface Props {
  envelope: CanonicalMessageEnvelope;
  isMe: boolean;
}

function LocationCard({ envelope, isMe }: Props) {
  const geo = envelope.metadata.geo;
  const timing = envelope.metadata.timing;
  const weather = envelope.metadata.weather;
  const isLive = envelope.type === "location_live";
  const [mapError, setMapError] = useState(false);

  const address = geo?.address || geo?.label || "Location shared";
  const hasCoords = geo?.lat != null && geo?.lng != null;
  const lat = geo?.lat ?? 0;
  const lng = geo?.lng ?? 0;

  const openMap = () => {
    if (hasCoords) {
      window.open(`https://maps.google.com/?q=${lat},${lng}`, "_blank");
    }
  };

  const mapEmbedUrl = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.008},${lat - 0.006},${lng + 0.008},${lat + 0.006}&layer=mapnik&marker=${lat},${lng}`
    : null;

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} px-2 py-0.5`}>
      <button
        onClick={openMap}
        className="max-w-[280px] w-[280px] rounded-2xl overflow-hidden text-left transition-transform active:scale-[0.98]"
        style={{
          background: isMe
            ? "linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.06))"
            : "hsl(var(--muted) / 0.5)",
          border: "1px solid hsl(var(--border) / 0.1)",
        }}
      >
        <div className="relative h-32 w-full overflow-hidden">
          {mapEmbedUrl && !mapError ? (
            <iframe
              src={mapEmbedUrl}
              className="w-full h-full border-0 pointer-events-none"
              loading="lazy"
              onError={() => setMapError(true)}
              title="Location preview"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: "hsl(var(--muted) / 0.3)" }}
            >
              <MapPin className="h-8 w-8" style={{ color: "hsl(var(--primary) / 0.5)" }} />
            </div>
          )}

          {isLive && (
            <div
              className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{
                background: "hsl(var(--destructive) / 0.85)",
                color: "white",
              }}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
              </span>
              <span className="text-[10px] font-bold tracking-wide">LIVE</span>
            </div>
          )}

          <div
            className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: "hsl(var(--primary))", color: "white" }}
          >
            <ExternalLink className="h-3 w-3" />
          </div>
        </div>

        <div className="px-3 py-2 space-y-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {isLive && (
              <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: "hsl(var(--destructive))" }} />
            )}
            <p className="text-xs font-semibold truncate" style={{ color: "hsl(var(--foreground))" }}>
              {isLive ? "Live location" : (geo?.label || "Location")}
            </p>
          </div>
          <p className="text-[11px] leading-tight line-clamp-2" style={{ color: "hsl(var(--muted-foreground))" }}>
            {address}
          </p>

          {weather?.condition && (
            <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground) / 0.7)" }}>
              {weather.condition} · {weather.temperatureC}°C
            </p>
          )}

          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>
              {timing?.localTime || ""}
            </span>
            <Navigation className="h-3 w-3" style={{ color: "hsl(var(--primary) / 0.6)" }} />
          </div>
        </div>
      </button>
    </div>
  );
}

export default memo(LocationCard);
