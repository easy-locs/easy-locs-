/**
 * location.guards — Validation guards for location operations.
 */

export function isValidCoords(lat: number, lng: number): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180 &&
    !isNaN(lat) && !isNaN(lng)
  );
}

export function isAccuracySufficient(accuracy: number | undefined, threshold = 100): boolean {
  if (accuracy === undefined) return true; // no data = assume ok
  return accuracy <= threshold;
}
