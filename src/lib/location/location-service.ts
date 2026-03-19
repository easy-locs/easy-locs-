/**
 * Location Service — High-accuracy geolocation with safety checks.
 */

export interface LiveLocation {
  lat: number;
  lng: number;
  accuracy: number;
  heading?: number;
  speed?: number;
  recordedAt: string;
}

function assertGeolocationSupport() {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("Geolocation is not supported on this device");
  }
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  assertGeolocationSupport();

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 3000,
    });
  });
}

export async function readLiveLocation(): Promise<LiveLocation> {
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
