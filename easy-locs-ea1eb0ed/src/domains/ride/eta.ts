/**
 * ETA Engine — live traffic + historical blending.
 *
 * Produces an ETA prediction that fuses:
 *   - live traffic speed (from provider or GPS fleet average)
 *   - historical median for the same hour-of-day / day-of-week bucket
 *   - distance along the routed path
 *
 * Output carries a confidence score so UIs can show optimistic/pessimistic
 * bands.
 */

export interface LiveTrafficSample {
  /** Current average speed along the corridor, km/h. */
  avgSpeedKmh: number;
  /** Sample size / observation count. */
  sampleSize: number;
  /** Age of the sample in seconds. */
  ageSeconds: number;
}

export interface HistoricalSample {
  /** Median duration (seconds) for the same route at this bucket. */
  medianSeconds: number;
  /** Interquartile range (seconds). */
  iqrSeconds: number;
  /** Number of historical observations. */
  sampleSize: number;
}

export interface EtaInputs {
  distanceKm: number;
  live?: LiveTrafficSample;
  historical?: HistoricalSample;
  /** Fallback default speed when neither signal is available. */
  fallbackSpeedKmh?: number;
}

export interface EtaPrediction {
  etaSeconds: number;
  lowSeconds: number;
  highSeconds: number;
  confidence: number;
  source: "live" | "historical" | "blended" | "fallback";
  details: {
    liveWeight: number;
    historicalWeight: number;
    distanceKm: number;
    impliedSpeedKmh: number;
  };
}

const DEFAULT_FALLBACK_SPEED = 28;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function liveFreshnessWeight(ageSec: number): number {
  if (ageSec <= 30) return 1.0;
  if (ageSec <= 120) return 0.85;
  if (ageSec <= 300) return 0.6;
  if (ageSec <= 600) return 0.3;
  return 0.05;
}

function historicalWeightFromSize(n: number): number {
  if (n <= 0) return 0;
  if (n >= 50) return 1.0;
  return Math.round((n / 50) * 100) / 100;
}

export function predictEta(inputs: EtaInputs): EtaPrediction {
  const fallback = inputs.fallbackSpeedKmh ?? DEFAULT_FALLBACK_SPEED;

  if (inputs.distanceKm <= 0) {
    return {
      etaSeconds: 0,
      lowSeconds: 0,
      highSeconds: 0,
      confidence: 1,
      source: "fallback",
      details: { liveWeight: 0, historicalWeight: 0, distanceKm: 0, impliedSpeedKmh: fallback },
    };
  }

  let liveSec: number | null = null;
  let liveWeight = 0;
  if (inputs.live && inputs.live.avgSpeedKmh > 0) {
    liveSec = (inputs.distanceKm / inputs.live.avgSpeedKmh) * 3600;
    const sizeWeight = clamp((inputs.live.sampleSize ?? 0) / 10, 0, 1);
    liveWeight = liveFreshnessWeight(inputs.live.ageSeconds) * sizeWeight;
  }

  let histSec: number | null = null;
  let histWeight = 0;
  if (inputs.historical && inputs.historical.medianSeconds > 0) {
    histSec = inputs.historical.medianSeconds;
    histWeight = historicalWeightFromSize(inputs.historical.sampleSize);
  }

  let etaSeconds: number;
  let source: EtaPrediction["source"];
  const totalWeight = liveWeight + histWeight;

  if (totalWeight <= 0.01) {
    etaSeconds = (inputs.distanceKm / fallback) * 3600;
    source = "fallback";
  } else if (liveSec != null && histSec != null && liveWeight > 0 && histWeight > 0) {
    etaSeconds = (liveSec * liveWeight + histSec * histWeight) / totalWeight;
    source = "blended";
  } else if (liveSec != null && liveWeight >= histWeight) {
    etaSeconds = liveSec;
    source = "live";
  } else if (histSec != null) {
    etaSeconds = histSec;
    source = "historical";
  } else {
    etaSeconds = (inputs.distanceKm / fallback) * 3600;
    source = "fallback";
  }

  const iqr = inputs.historical?.iqrSeconds ?? etaSeconds * 0.35;
  const low = Math.max(30, etaSeconds - iqr / 2);
  const high = etaSeconds + iqr / 2;

  const confidence = clamp(
    0.4 + liveWeight * 0.35 + Math.min(histWeight, 1) * 0.25,
    0.3,
    0.99,
  );

  const impliedSpeed = (inputs.distanceKm / (etaSeconds / 3600));

  return {
    etaSeconds: Math.round(etaSeconds),
    lowSeconds: Math.round(low),
    highSeconds: Math.round(high),
    confidence: Math.round(confidence * 100) / 100,
    source,
    details: {
      liveWeight: Math.round(liveWeight * 100) / 100,
      historicalWeight: Math.round(histWeight * 100) / 100,
      distanceKm: inputs.distanceKm,
      impliedSpeedKmh: Math.round(impliedSpeed * 10) / 10,
    },
  };
}

export function formatEta(seconds: number): string {
  if (seconds < 60) return `${Math.max(0, Math.round(seconds))}s`;
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h}h ${rm}m` : `${h}h`;
}
