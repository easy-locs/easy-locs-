/**
 * Location Service — High-accuracy geolocation for driver tracking.
 */

export interface LiveLocationPoint {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  recordedAt: string;
}

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 3000,
    });
  });
}

export async function readLiveLocation(): Promise<LiveLocationPoint> {
  const pos = await getCurrentPosition();
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    heading: pos.coords.heading ?? undefined,
    speed: pos.coords.speed ?? undefined,
    recordedAt: new Date().toISOString(),
  };
}
