import { MapPin, RefreshCw, WifiOff } from "lucide-react";

interface MapErrorFallbackProps {
  message?: string;
  locationLabel?: string;
  lat?: number | null;
  lng?: number | null;
  className?: string;
  compact?: boolean;
  style?: React.CSSProperties;
  onRetry?: () => void;
  isOffline?: boolean;
  isOnCooldown?: boolean;
  cooldownRemaining?: number;
  retryCount?: number;
  maxRetries?: number;
  exhausted?: boolean;
}

export default function MapErrorFallback({
  message,
  locationLabel,
  lat,
  lng,
  className = "",
  compact = false,
  style,
  onRetry,
  isOffline = false,
  isOnCooldown = false,
  cooldownRemaining = 0,
  retryCount = 0,
  maxRetries = 5,
  exhausted = false,
}: MapErrorFallbackProps) {
  const hasCoords = lat != null && lng != null;
  const showRetry = !!onRetry;

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
            aria-hidden="true"
            className="text-primary/60"
            style={{ width: compact ? 20 : 28, height: compact ? 20 : 28 }}
          />
        </div>
        <div role="alert" aria-live="assertive">
          <p
            className="font-semibold mb-1"
            style={{
              fontSize: compact ? 12 : 14,
              color: "rgba(255,255,255,0.8)",
            }}
          >
            Map unavailable
          </p>
          {exhausted ? (
            <p
              className="leading-relaxed"
              style={{
                fontSize: compact ? 10 : 11,
                color: "rgba(255,255,255,0.4)",
              }}
            >
              Please try again later
            </p>
          ) : (
            message && (
              <p
                className="leading-relaxed"
                style={{
                  fontSize: compact ? 10 : 11,
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                {message}
              </p>
            )
          )}
        </div>
        {isOffline && (
          <p
            role="status"
            aria-live="polite"
            className="mt-2 flex items-center justify-center gap-1"
            style={{ fontSize: 11, color: "rgba(255,200,100,0.7)" }}
          >
            <WifiOff aria-hidden="true" style={{ width: 12, height: 12 }} />
            No internet — will retry automatically when reconnected
          </p>
        )}
        {locationLabel && (
          <p
            className="mt-2 flex items-center justify-center gap-1"
            style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}
          >
            <MapPin aria-hidden="true" style={{ width: 12, height: 12 }} />
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
        {showRetry && !exhausted && (
          <button
            type="button"
            onClick={onRetry}
            disabled={isOnCooldown}
            aria-disabled={isOnCooldown}
            aria-label={
              isOnCooldown
                ? `Retry in ${cooldownRemaining} seconds`
                : `Retry map load, attempt ${retryCount} of ${maxRetries}`
            }
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
            style={{
              background: isOnCooldown
                ? "rgba(255,255,255,0.05)"
                : "hsl(var(--primary) / 0.15)",
              color: isOnCooldown
                ? "rgba(255,255,255,0.3)"
                : "hsl(var(--primary))",
              cursor: isOnCooldown ? "not-allowed" : "pointer",
              border: "1px solid",
              borderColor: isOnCooldown
                ? "rgba(255,255,255,0.05)"
                : "hsl(var(--primary) / 0.2)",
            }}
          >
            <RefreshCw
              aria-hidden="true"
              style={{ width: 12, height: 12 }}
              className={isOnCooldown ? "animate-spin" : ""}
            />
            {isOnCooldown
              ? `Retry in ${cooldownRemaining}s`
              : `Retry (${retryCount}/${maxRetries})`}
          </button>
        )}
      </div>
    </div>
  );
}
