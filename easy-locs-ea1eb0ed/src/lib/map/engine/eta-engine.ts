/**
 * Dynamic ETA engine — Continuously refines an arrival estimate from a
 * stream of GPS positions, route progress and current traffic.
 *
 * Used by Ride/Taxi (driver → pickup → drop-off) and Delivery tracking.
 *
 * Lightweight, dependency-free; no external API calls. Pluggable
 * `TrafficSampler` lets callers feed congestion data from `traffic-engine`.
 */
import { recomputeEta, type CongestionLevel, type EtaSegment } from "./traffic-engine";

export interface RouteSegment {
  /** Distance in meters. */
  distance: number;
  /** Baseline duration in seconds (e.g. from routing engine). */
  duration: number;
  /** Optional polyline for traffic sampling. */
  coordinates?: [number, number][];
}

export interface DynamicEtaInput {
  /** Distance covered so far in meters along the route. */
  progressMeters: number;
  /** Current speed in m/s, optional smoothing input. */
  speedMps?: number;
  /** Route segments remaining ahead of progress. */
  remaining: RouteSegment[];
  /** Optional sampler returning congestion at a coordinate. */
  sampler?: (coord: [number, number]) => CongestionLevel | undefined;
}

export interface DynamicEtaResult {
  /** Total seconds remaining to destination. */
  etaSeconds: number;
  /** Wall-clock arrival time. */
  arrivalAt: Date;
  /** Smoothed average speed (m/s). */
  speedMps: number;
  /** Distance remaining in meters. */
  distanceMeters: number;
}

const SPEED_HISTORY_MAX = 20;

export class DynamicEtaTracker {
  private speeds: number[] = [];
  private lastTs = 0;

  pushSpeed(speedMps: number) {
    if (!Number.isFinite(speedMps) || speedMps < 0) return;
    this.speeds.push(speedMps);
    if (this.speeds.length > SPEED_HISTORY_MAX) this.speeds.shift();
    this.lastTs = Date.now();
  }

  averageSpeedMps(): number {
    if (this.speeds.length === 0) return 0;
    return this.speeds.reduce((a, b) => a + b, 0) / this.speeds.length;
  }

  compute(input: DynamicEtaInput): DynamicEtaResult {
    if (typeof input.speedMps === "number") this.pushSpeed(input.speedMps);

    const segments: EtaSegment[] = input.remaining.map((seg) => {
      let congestion: CongestionLevel | undefined;
      if (input.sampler && seg.coordinates && seg.coordinates.length > 0) {
        const mid = seg.coordinates[Math.floor(seg.coordinates.length / 2)];
        congestion = input.sampler(mid);
      }
      return { durationSeconds: seg.duration, congestion };
    });
    let eta = recomputeEta(segments);

    const avgSpeed = this.averageSpeedMps();
    if (avgSpeed > 0.5) {
      const totalDistance = input.remaining.reduce((a, s) => a + s.distance, 0);
      const speedBased = totalDistance / avgSpeed;
      eta = eta * 0.6 + speedBased * 0.4;
    }

    const arrivalAt = new Date(Date.now() + eta * 1000);
    const distanceMeters = input.remaining.reduce((a, s) => a + s.distance, 0);
    return { etaSeconds: eta, arrivalAt, speedMps: avgSpeed, distanceMeters };
  }

  reset() {
    this.speeds = [];
    this.lastTs = 0;
  }
}

export function formatEtaShort(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  if (seconds < 60) return "<1 min";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} h` : `${h} h ${m}`;
}
