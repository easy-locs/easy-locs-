export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function sortRadarPoints<T extends { lat: number; lng: number; rating?: number | null; isSponsored?: boolean }>(
  points: T[],
  user: { lat: number; lng: number } | null,
  mode: "nearest" | "best" | "trending" = "nearest"
): (T & { distanceKm: number })[] {
  const enriched = points.map((p) => ({
    ...p,
    distanceKm: user ? haversineKm(user.lat, user.lng, p.lat, p.lng) : 9999,
  }));

  if (mode === "best") {
    return enriched.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || a.distanceKm - b.distanceKm);
  }
  if (mode === "trending") {
    return enriched.sort((a, b) => (b.isSponsored ? 1 : 0) - (a.isSponsored ? 1 : 0) || a.distanceKm - b.distanceKm);
  }
  return enriched.sort((a, b) => a.distanceKm - b.distanceKm);
}
