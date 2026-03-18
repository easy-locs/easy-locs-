/**
 * Ray-casting point-in-polygon test.
 * polygon: array of [lng, lat] coordinate pairs (GeoJSON style).
 */
export function isPointInPolygon(
  point: { lat: number; lng: number },
  polygon: [number, number][]
): boolean {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0],
      yi = polygon[i][1];
    const xj = polygon[j][0],
      yj = polygon[j][1];

    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}
