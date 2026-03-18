/**
 * zone-utils — Geo zone helpers for demand heatmap grid.
 */

export function toZoneKey(lat: number, lng: number, precision = 2) {
  const a = Number(lat).toFixed(precision);
  const b = Number(lng).toFixed(precision);
  return `${a}:${b}`;
}

export function roundCoord(v: number, precision = 2) {
  return Number(Number(v).toFixed(precision));
}
