/**
 * LocationCard — Inline location card for static/live location messages.
 */
import { memo } from "react";
import { MapPin, Navigation } from "lucide-react";
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

  const address = geo?.address || geo?.label || "Location shared";
  const hasCoords = geo?.lat != null && geo?.lng != null;

  const openMap = () => {
    if (hasCoords) {
      window.open(`https://maps.google.com/?q=${geo!.lat},${geo!.lng}`, "_blank");
    }
  };

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} px-2 py-0.5`}>
      <button
        onClick={openMap}
        className="max-w-[280px] rounded-2xl overflow-hidden text-left transition-transform active:scale-[0.98]"
        style={{
          background: isMe
            ? "linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.06))"
            : "hsl(var(--muted) / 0.5)",
          border: "1px solid hsl(var(--border) / 0.1)",
        }}
      >
        {/* Map preview placeholder */}
        <div
          className="h-28 w-full flex items-center justify-center"
          style={{ background: "hsl(var(--muted) / 0.3)" }}
        >
          <MapPin className="h-8 w-8" style={{ color: "hsl(var(--primary) / 0.5)" }} />
        </div>

        <div className="px-3 py-2 space-y-1">
          <div className="flex items-center gap-1.5">
            {isLive && (
              <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: "hsl(var(--destructive))" }} />
            )}
            <p className="text-xs font-semibold" style={{ color: "hsl(var(--foreground))" }}>
              {isLive ? "Live location" : "Location"}
            </p>
          </div>
          <p className="text-[11px] leading-tight" style={{ color: "hsl(var(--muted-foreground))" }}>
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
