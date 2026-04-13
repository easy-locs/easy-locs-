/**
 * Radar default configuration values.
 * Centralised here so they can be changed without touching components.
 */

/**
 * Default map center used as a GPS fallback when the user's location is
 * unavailable or permission is denied.
 * Coordinates: Dubai city center (lat 25.2048, lng 55.2708).
 */
export const RADAR_GPS_FALLBACK_CENTER = { lat: 25.2048, lng: 55.2708 } as const;
