import { MapPin } from "lucide-react";

interface MapErrorFallbackProps {
  message?: string;
  locationLabel?: string;
  lat?: number | null;
  lng?: number | null;
  className?: string;
  compact?: boolean;
  style?: React.CSSProperties;
}

export default function MapErrorFallback({
  message,
  locationLabel,
  lat,
  lng,
  className = "",
  compact = false,
  style,
}: MapErrorFallbackProps) {
  const hasCoords = lat != null && lng != null;

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{
        minHeight: compact ? 120 : 200,
        background: "linear-gradient(135deg, hsl(226 24% 10%), hsl(226 22% 15%))",
        borderRadius: 16,
        ...style,
      }}
    >
      <div className="text-center px-6 py-4">
        <div
          className="mx-auto mb-3 flex items-center justify-center rounded-2xl"
          style={{
            width: compact ? 40 : 56,
            height: compact ? 40 : 56,
            background: "hsl(var(--primary) / 0.1)",
          }}
        >
          <MapPin
            className="text-primary/60"
            style={{ width: compact ? 20 : 28, height: compact ? 20 : 28 }}
          />
        </div>
        <p
          className="font-semibold mb-1"
          style={{
            fontSize: compact ? 12 : 14,
            color: "rgba(255,255,255,0.8)",
          }}
        >
          Map unavailable
        </p>
        {message && (
          <p
            className="leading-relaxed"
            style={{
              fontSize: compact ? 10 : 11,
              color: "rgba(255,255,255,0.4)",
            }}
          >
            {message}
          </p>
        )}
        {locationLabel && (
          <p
            className="mt-2 flex items-center justify-center gap-1"
            style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}
          >
            <MapPin style={{ width: 12, height: 12 }} />
            {locationLabel}
          </p>
        )}
        {hasCoords && !locationLabel && (
          <p
            className="mt-1 font-mono"
            style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}
          >
            {lat!.toFixed(6)}, {lng!.toFixed(6)}
          </p>
        )}
      </div>
    </div>
  );
}
