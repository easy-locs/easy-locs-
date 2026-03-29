/**
 * LocationViewerOverlay — Full-screen location map viewer.
 * Isolated from thread rendering. Managed by useLocationViewer store.
 */
import { memo } from "react";
import { X, Navigation, ExternalLink, Compass } from "lucide-react";
import { useLocationViewer } from "@/families/location";

function LocationViewerOverlayInner() {
  const { open, lat, lng, label, mode, isLive, close } = useLocationViewer();

  if (!open || lat == null || lng == null) return null;

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.015},${lat - 0.012},${lng + 0.015},${lat + 0.012}&layer=mapnik&marker=${lat},${lng}`;
  const externalUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: "hsl(var(--background))" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "hsl(var(--border) / 0.2)" }}>
        <div className="flex items-center gap-2">
          {isLive ? (
            <Navigation className="h-5 w-5" style={{ color: "hsl(var(--primary))" }} />
          ) : (
            <Compass className="h-5 w-5" style={{ color: "hsl(var(--primary))" }} />
          )}
          <div>
            <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
              {label || (isLive ? "Live Location" : "Location")}
            </p>
            {isLive && (
              <p className="text-[10px] font-medium flex items-center gap-1" style={{ color: "hsl(var(--primary))" }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "hsl(var(--primary))" }} />
                Sharing live
              </p>
            )}
          </div>
        </div>
        <button
          onClick={close}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80"
          style={{ background: "hsl(var(--muted))" }}
        >
          <X className="h-4 w-4" style={{ color: "hsl(var(--foreground))" }} />
        </button>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <iframe
          src={mapUrl}
          className="w-full h-full border-0"
          loading="lazy"
        />
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-center gap-4 px-4 py-3 border-t" style={{ borderColor: "hsl(var(--border) / 0.2)" }}>
        <p className="text-[11px]" style={{ color: "hsl(var(--muted-foreground))" }}>
          {lat.toFixed(6)}, {lng.toFixed(6)}
        </p>
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
          style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open in Maps
        </a>
      </div>
    </div>
  );
}

export const LocationViewerOverlay = memo(LocationViewerOverlayInner);
LocationViewerOverlay.displayName = "LocationViewerOverlay";
