import { radarRepo } from "@/repositories/domain/radar.repo";

export async function fetchRadarLiveData(mode: "client" | "rider" | "merchant" | "admin") {
  const [geoContexts, zoneEvents] = await Promise.all([
    radarRepo.fetchGeoLiveContext(),
    radarRepo.fetchActiveZoneEvents(),
  ]);

  let riders: Record<string, unknown>[] = [];
  if (mode === "rider" || mode === "admin") {
    riders = await radarRepo.fetchOnlineRiders();
  }

  return {
    geoContexts,
    riders,
    zoneEvents,
  };
}
