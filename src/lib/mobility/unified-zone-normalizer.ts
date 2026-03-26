/**
 * Zone Normalizer — safe defaults for zone context across all mobility contexts.
 */
import type {
  MobilityTrafficLevel,
  MobilityWeatherType,
  MobilityZoneContext,
} from "./unified-mobility.types";

export function normalizeZoneContext(
  input?: Partial<MobilityZoneContext> | null,
): MobilityZoneContext {
  return {
    zoneKey: input?.zoneKey ?? null,
    demand: input?.demand ?? 20,
    supply: input?.supply ?? 10,
    traffic: (input?.traffic ?? "moderate") as MobilityTrafficLevel,
    weather: (input?.weather ?? "clear") as MobilityWeatherType,
    merchantPrepMinutes: input?.merchantPrepMinutes ?? 0,
    merchantBusyLevel: input?.merchantBusyLevel ?? 0,
  };
}
