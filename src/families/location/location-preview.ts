/**
 * location.preview — Canonical location preview helpers for thread bubbles.
 * Label formatting, thumbnail state, coordinate-safe rendering.
 */

export interface LocationPreviewData {
  lat: number;
  lng: number;
  label: string;
  mode: "static" | "live" | "place";
  mapThumbnailUrl: string;
  openMapUrl: string;
}

/** Build canonical preview data from message metadata */
export function buildLocationPreview(metadata: Record<string, any>): LocationPreviewData | null {
  const lat = parseFloat(metadata?.lat);
  const lng = parseFloat(metadata?.lng);
  if (isNaN(lat) || isNaN(lng)) return null;

  const mode = (metadata?.mode as "static" | "live" | "place") || "static";
  const label = metadata?.label || (mode === "live" ? "📡 Live location" : "📍 Location");

  return {
    lat,
    lng,
    label,
    mode,
    mapThumbnailUrl: `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.008},${lat - 0.006},${lng + 0.008},${lat + 0.006}&layer=mapnik&marker=${lat},${lng}`,
    openMapUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`,
  };
}

/** Get a privacy-safe location label (hides exact coords) */
export function getLocationLabel(metadata: Record<string, any>): string {
  if (metadata?.label) return metadata.label;
  if (metadata?.mode === "live") return "📡 Live location";
  return "📍 Shared location";
}
