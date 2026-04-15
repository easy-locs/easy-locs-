export const FALLBACK_COORDS: Record<string, { lat: number; lng: number }> = {
  AE: { lat: 25.2048, lng: 55.2708 },
  SA: { lat: 24.7136, lng: 46.6753 },
  EG: { lat: 30.0444, lng: 31.2357 },
  MA: { lat: 33.5731, lng: -7.5898 },
  FR: { lat: 48.8566, lng: 2.3522 },
  PK: { lat: 33.6844, lng: 73.0479 },
  TR: { lat: 39.9334, lng: 32.8597 },
  ID: { lat: -6.2088, lng: 106.8456 },
  BD: { lat: 23.8103, lng: 90.4125 },
  MY: { lat: 3.1390, lng: 101.6869 },
  SN: { lat: 14.7167, lng: -17.4677 },
  NG: { lat: 9.0579, lng: 7.4951 },
  IN: { lat: 28.6139, lng: 77.2090 },
  GB: { lat: 51.5074, lng: -0.1278 },
  US: { lat: 40.7128, lng: -74.0060 },
  DE: { lat: 52.5200, lng: 13.4050 },
  CA: { lat: 43.6532, lng: -79.3832 },
  AU: { lat: -33.8688, lng: 151.2093 },
  TN: { lat: 36.8065, lng: 10.1815 },
  DZ: { lat: 36.7538, lng: 3.0588 },
  IQ: { lat: 33.3152, lng: 44.3661 },
  JO: { lat: 31.9454, lng: 35.9284 },
  KW: { lat: 29.3759, lng: 47.9774 },
  QA: { lat: 25.2854, lng: 51.5310 },
  BH: { lat: 26.2285, lng: 50.5860 },
  OM: { lat: 23.5880, lng: 58.3829 },
  LB: { lat: 33.8938, lng: 35.5018 },
  LY: { lat: 32.8872, lng: 13.1913 },
  SD: { lat: 15.5007, lng: 32.5599 },
  SO: { lat: 2.0469, lng: 45.3182 },
};

export function getFallbackCoords(country: string): { lat: number; lng: number } {
  return FALLBACK_COORDS[country.toUpperCase()] ?? FALLBACK_COORDS.AE;
}

export function getGPSOrFallback(country: string): Promise<{ lat: number; lng: number; source: "gps" | "fallback" }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      const c = getFallbackCoords(country);
      resolve({ ...c, source: "fallback" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, source: "gps" }),
      () => {
        const c = getFallbackCoords(country);
        resolve({ ...c, source: "fallback" });
      },
      { timeout: 8000, maximumAge: 300000 }
    );
  });
}
